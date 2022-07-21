// Memanggil Library
const express = require('express');
const expressLayouts = require('express-ejs-layouts')
const fs = require('fs')
const bcrypt = require('bcrypt')
const m = require('moment');
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
const {
    utc
} = require('moment');
// Built-in Middleware
app.use(express.static('public'));
// gunakan ejs
app.set('view engine', 'ejs');
// Third-party Middleware
app.use(express.static('public'))
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


    const sql = "SELECT * FROM forum_post ORDER BY id_post ASC "
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }
        res.render('home', {
            title: "Ada Forum",
            layout: "layout/main-layout",
            posts: results.rows,
            msg: req.flash('msg')
        })

    })

})

// Membuat Proses menuju Register
app.get('/users/register', (req, res) => {


    res.render('register', {
        title: "BA Registration",
        layout: "layout/main-layout",
        data: req.body
    })
})

// Membuat Proses menuju login Page 
app.get('/users/login', (req, res) => {


    // const cariUser = await pool.query(`SELECT username,password FROM tb_users WHERE username = '${valueUsername}'`)
    // const cariUsername = cariUser.rows[0]
    // const cariPassword = cariPassword.rows[1]

    res.render('login', {
        title: "BA Login",
        layout: "layout/main-layout",
        msg: req.flash('msg')
    })
})
// Melakukan Proses Login page
app.post('/login', [
    body('username').custom(async (valueUsername) => {

        // Mencari nama yang sama di query
        const queryDuplikat = await pool.query(`SELECT * FROM tb_users WHERE username = '${valueUsername}'`)
        const duplikat = queryDuplikat.rows[0]

        if (!duplikat) {
            throw new Error(`${valueUsername} sudah terdaftar! `);

        }

        return true;
    }),
], async (req, res) => {
    if (!errors.isEmpty()) {



        res.render('register', {
            title: 'Form Tambah Data Contact',
            layout: 'layout/main-layout',
            errors: errors.array(),

        });

    } else {


    }

})
// Membuat Proses Category Page 
app.get('/category', (req, res) => {


    res.render('category', {
        title: "Kategori Pembahasan",
        layout: "layout/main-layout"
    })
})

// Membuat Proses menuju MyForum
app.get('/myforum', (req, res) => {

    const sql = "SELECT forum_post.id_post,forum_post.title,forum_sub_category.title_sub_category,forum_post.content,forum_post.date," +
        "forum_post.image,tb_users.username FROM forum_post INNER JOIN forum_sub_category ON forum_post.id_sub_category =" +
        " forum_sub_category.id_sub_category INNER JOIN tb_users ON forum_post.id_user = tb_users.id_user " +
        "ORDER BY forum_post.date ASC"
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }

        res.render('myforum', {
            title: "My Forum Page",
            layout: "layout/main-layout",
            forums: results.rows,
            msg: req.flash('msg')

        })
    })

})

// Menampilkan semua data setting category page
app.get('/setting-category', (req, res) => {
    // res.send('This is contact Page!')

    // const contacts = loadContact();
    // Memanggil query semua nama Category
    // const sql = "SELECT title, to_char(date,'yyyy-MM-dd, HH24:MI:SS')  FROM forum_category ORDER BY date ASC"
    const sql = "SELECT title_category, date  FROM forum_category ORDER BY date ASC"
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }

        res.render('setting-category', {
            title: "Setting Category",
            layout: "layout/main-layout",
            categorys: results.rows,
            msg: req.flash('msg')

        })
    })
})
// Menampilkan semua data setting sub category page
app.get('/setting-sub-category', (req, res) => {
    // res.send('This is contact Page!')

    // const contacts = loadContact();
    // Memanggil query semua nama Category
    // const sql = "SELECT title, to_char(date,'yyyy-MM-dd, HH24:MI:SS')  FROM forum_category ORDER BY date ASC"
    const sql = "SELECT id_sub_category, forum_category.title_category, title_sub_category, forum_sub_category.date FROM public.forum_sub_category " +
        "INNER JOIN forum_category ON forum_sub_category.id_category = forum_category.id_category ORDER BY id_sub_category ASC "
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }

        res.render('setting-sub-category', {
            title: "Setting Sub Kategori",
            layout: "layout/main-layout",
            subCategorys: results.rows,
            msg: req.flash('msg')

        })
    })
})
// Tambah
// Menampilkan semua data Forum Page
app.get('/myforum/add', (req, res) => {



    res.render('setting-category', {
        title: "My Forum",
        layout: "layout/main-layout",


    })

})

// membuat Proses menuju add-category atau add contact
app.get('/category/add', (req, res) => {


    res.render('add-category', {
        title: "Category Pembahasan",
        layout: "layout/main-layout"
    })
})

// Proses menuju form tambah category
app.get('/setting-category/add', (req, res) => {

    res.render('add-category', {
        title: "Form Sub Kategori",
        layout: "layout/main-layout"
    })

})
// Proses Menuju tambah sub-category
app.get('/sub-category/add', (req, res) => {


    res.render('add-sub-category', {
        title: "Category Pembahasan",
        layout: "layout/main-layout"
    })
})



// Proses Create
// Proses Daftar Registrasi user
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

// Insert Data category 
app.post('/category', [
    body('title').custom(async (valueTitle) => {

        // Mencari nama yang sama di query
        const queryDuplikat = await pool.query(`SELECT * FROM forum_category WHERE title = '${valueTitle}'`)
        const duplikat = queryDuplikat.rows[0]

        if (duplikat) {
            throw new Error(`Category ${valueTitle} sudah Digunakan! `);

        }

        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {


        res.render('add-category', {
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
            const title = req.body.title;
            const date = Date.now('yyyy-MM-dd');



            //Menggunakan query insert untuk memasukan data atau mengadd data
            const dataAdd = await pool.query(`INSERT INTO forum_category(
                title,date) values ('${title}','${date}') `)
            dataAdd;
            req.flash('msg', 'Selamat kamu telah terdaftar, Silakan Melakukan login')
            res.redirect('/setting-category');
        } catch (err) {
            console.error(err.message)
        }

    }


});

// BelomBisa sub-category
app.post('/sub-category', [
    body('title').custom(async (valueTitle) => {

        // Mencari nama yang sama di query
        const queryDuplikat = await pool.query(`SELECT * FROM forum_category WHERE title = '${valueTitle}'`)
        const duplikat = queryDuplikat.rows[0]

        if (duplikat) {
            throw new Error(`Category ${valueTitle} sudah Digunakan! `);

        }

        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {


        res.render('add-category', {
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
            const title = req.body.title;
            const date = Date.now('yyyy-MM-dd');



            //Menggunakan query insert untuk memasukan data atau mengadd data
            const dataAdd = await pool.query(`INSERT INTO forum_category(
                title,date) values ('${title}','${date}') `)
            dataAdd;
            req.flash('msg', 'Selamat kamu telah terdaftar, Silakan Melakukan login')
            res.redirect('/setting-category');
        } catch (err) {
            console.error(err.message)
        }

    }


});


app.use('/', (req, res) => {
    res.status(404)
    res.send('Page Not found : 404')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})