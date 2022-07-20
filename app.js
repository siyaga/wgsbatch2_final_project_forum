// Memanggil Library
const express = require('express');
const expressLayouts = require('express-ejs-layouts')
const fs = require('fs')

const login = require('./utils/login');
const morgan = require('morgan');
// const session = require('express-session');
// const cookieParser = require('cookie-parser');

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
// menggunakan log activity 
app.use(morgan('dev'))
app.set('layout', './layout/main-layout')

// Membuat Proses Home Page atau Main Page
app.get('/', (req, res) => {


    res.render('home', {
        title: "Bahas Anime",
        layout: "layout/main-layout"
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
app.get('/users/login', (req, res) => {


    res.render('login', {
        title: "BA Login",
        layout: "layout/main-layout"
    })
})



app.post('/register', [
    // body('username'.custom(async (user) => {
    //         const quaryDuplicate = await pool.query(`Select nama FROM tb_user WHERE nama='${user}'`)
    //         const duplikat = quaryDuplicate.rows[0]

    //         if (duplikat) {
    //             throw new Error(`Username ${value} sudah di gunakan, mohon untuk di ganti`);
    //         }
    //         return true;
    //     }),
    //     check('email', 'Email tidak valid!').isEmail(),
    //     check('mobile', 'Mobile tidak valid!').isMobilePhone('id-ID')
    // )
], async (req, res) => {

    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     res.render('register', {
    //         title: 'BA Register',
    //         layout: 'layout/main-layout',
    //         errors: errors.array(),
    //         dataOld: req.body
    //     })

    // } else {
    try {
        const username = req.body.username
        const mobile = req.body.mobile
        const password = req.body.password

        const registerAdd = await pool.query(`INSERT INTO tb_user values ('${username}', '${password}')`)
        registerAdd
        res.redirect('/login')

    } catch (err) {
        console.error(err.message)
    }

    // }


})


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