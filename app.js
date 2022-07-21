// Memanggil Library
const express = require('express');
const expressLayouts = require('express-ejs-layouts')
const fs = require('fs')
const bcrypt = require('bcrypt')
const login = require('./utils/login');
const session = require('express-session');
const flash = require('express-flash');

const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const app = express()
const port = 3000

const pool = require('./db');
const {
    query
} = require('express');
const {
    body,
    check,
    validationResult
} = require('express-validator');
// Built-in Middleware
app.use(express.static('public'));
// gunakan ejs
app.set('view engine', 'ejs');
// Third-party Middleware
app.use(expressLayouts);
app.use(express.urlencoded({
    extended: true
}));
// Comfigure flash 
app.use(cookieParser('secret'));
app.use(session({
    cookie: {
        maxAge: 6000
    },
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
}));
app.use(flash());
// menggunakan log activity 
app.use(morgan('dev'))
app.set('layout', './layout/main-layout')

// Membuat Proses Home Page atau Main Page
app.get('/', (req, res) => {


    res.render('home', {
        title: "Bahas Anime",
        layout: "layout/main-layout",
        user: 'adi riyanto'
    })
})
app.get('/myforum', (req, res) => {
    res.render('forum', {
        title: "Home",
        layout: "layout/main-layout",
        forums
    })

})
// Membuat Proses Register
app.get('/users/register', (req, res) => {


    res.render('register', {
        title: "BA Registration",
        layout: "layout/main-layout",
        data: req.body
    })
})

// Membuat Proses login Page 
app.get('/users/login', async (req, res) => {


    // const cariUser = await pool.query(`SELECT username,password FROM tb_users WHERE username = '${valueUsername}'`)
    // const cariUsername = cariUser.rows[0]
    // const cariPassword = cariPassword.rows[1]

    res.render('login', {
        title: "BA Login",
        layout: "layout/main-layout",
        msg: req.flash('msg')
    })
})

app.post('/login', [], async (req, res) => {
    if (!errors.isEmpty()) {


        res.render('register', {
            title: 'Form Tambah Data Contact',
            layout: 'layout/main-layout',
            errors: errors.array(),
            data: req.body

        });

    } else {


    }

})

// Login Registrasi user
app.post('/register', [
    body('username').custom(async (valueUsername) => {

        // Mencari nama yang sama di query
        const queryDuplikat = await pool.query(`SELECT * FROM tb_users WHERE username = '${valueUsername}'`)
        const duplikat = queryDuplikat.rows[0]

        if (duplikat) {
            throw new Error(`${valueUsername} sudah terdaftar! `);

        }

        return true;
    }),
    check('email', 'Email tidak valid!').isEmail(),
    // Pengecekan password arus lebih dari 6 karakter
    check('password', 'password harus lebih dari 6 karakter').isLength({
        min: 6
    }),
    // Pengecekan password harus di ulang sama dengan password comfirm
    body('password').custom((valuePassword, {
        req
    }) => {

        if (valuePassword !== req.body.password2) {
            throw new Error(`Password tidak sama, mohon isikan ulang`);
        }
        return true;
    }),
    // check('password' != 'password2', 'password tidak sama mohon isi ulang')
    // check('mobile', 'No HP tidak valid!').isMobilePhone('id-ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {


        res.render('register', {
            title: 'Form Tambah Data Contact',
            layout: 'layout/main-layout',
            errors: errors.array(),
            data: req.body

        });

    } else {
        // addDataContact(req.body);
        // addContact di postgre
        try {
            // Mengambil isi form yang di isikan oleh user
            const username = req.body.username;
            const nama = req.body.nama;
            const email = req.body.email;
            const password = req.body.password;
            const passwordhash = bcrypt.hashSync(password, 10);
            //Menggunakan query insert untuk memasukan data atau mengadd data
            const dataAdd = await pool.query(`INSERT INTO tb_users(
                username,nama,email, password) values ('${username}','${nama}','${email}','${passwordhash}') `)
            dataAdd;
            req.flash('msg', 'Selamat kamu telah terdaftar, Silakan Melakukan login')
            res.redirect('/users/login');
        } catch (err) {
            console.error(err.message)
        }

    }


});



// Membuat Proses Category Page 
app.get('/category', (req, res) => {


    res.render('category', {
        title: "Category Pembahasan",
        layout: "layout/main-layout"
    })
})





app.use('/', (req, res) => {
    res.status(404)
    res.send('Page Not found : 404')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})