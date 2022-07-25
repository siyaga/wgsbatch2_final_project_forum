// Memanggil Library
const express = require('express');
const fs = require('fs')
const expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcrypt');
const moment = require('moment');
const capitalize = require('capitalize');
const login = require('./utils/login');
const session = require('express-session');
const flash = require('express-flash');
const morgan = require('morgan');
const multer = require('multer')
const cookieParser = require('cookie-parser');
const passport = require('passport');

const initializePassport = require("./passportConfig");

initializePassport(passport);


const app = express()
const port = 3000



const pool = require('./db');
const {
    query,
    response
} = require('express');
const {
    body,
    check,
    validationResult
} = require('express-validator');

const {
    resolveTxt
} = require('dns');
const {
    get
} = require('http');
const {
    error
} = require('console');

const fileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, './public/image');
    },
    filename: (req, file, callback) => {
        callback(null, new Date().getTime() + '-' + file.originalname);
    }
});


const kirim = multer({
    storage: fileStorage
})



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
app.use(session({

    secret: 'secret',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session())
app.use(flash());
// menggunakan log activity 
app.use(morgan('dev'))
app.use((req, res, next) => {
    res.locals.user = moment;
    next();
});
app.set('layout', './layout/main-layout')



// Membuat Proses menuju login Page 
app.get('/users/login', checkAuthenticated, (req, res) => {
    res.render('login', {
        title: "Login",
        layout: "layout/main-layout",
        users: authUser(req.user)
    })
})
// Melakukan Proses Login page
app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/users/login",
    failureFlash: true,
    successFlash: true,
}));

function authUser(req) {
    if (req === undefined) {
        return 'null';
    } else {
        return req

    }
}



// main page
app.get('/', async (req, res) => {

    const sql = "SELECT title_post,content, forum_category.title_category, forum_post.date, forum_post.image, tb_users.username FROM forum_post " +
        "INNER JOIN forum_category ON forum_post.id_category = forum_category.id_category " +
        "INNER JOIN tb_users ON forum_post.id_user = tb_users.id_user ORDER BY forum_post.date DESC "
    pool.query(sql, [], (error, results) => {

        res.render('home', {
            title: "Ada Forum",
            layout: "layout/main-layout",
            posts: results.rows,
            msg: req.flash('msg'),
            users: authUser(req.user),
            moment: moment,
            capitalize: capitalize
        })


    })

})


// Membuat Proses menuju Register
app.get('/users/register', (req, res) => {


    res.render('register', {
        title: "Registration",
        layout: "layout/main-layout",
        data: req.body,
        users: authUser(req.user),
    })
})


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
            data: req.body,
            users: authUser(req.user),

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
            const roleAuto = 'user';
            //Menggunakan query insert untuk memasukan data atau mengadd data
            const dataAdd = await pool.query(`INSERT INTO tb_users(
                username,nama,email, password, role) values ('${username}','${nama}','${email}','${passwordhash}','${roleAuto}') `)
            dataAdd;
            req.flash('msg', 'Selamat kamu telah terdaftar, Silakan Melakukan login')
            res.redirect('/users/login');
        } catch (err) {
            console.error(err.message)
        }

    }


});



// Melakukan Logout
app.get('/users/logout', checkNotAuthenticated, (req, res) => {
    req.logout(function (error) {
        if (error) {
            return next(error)
        }
    });

    req.flash('success_msg', "You have logout")
    res.redirect("/users/login")

})

app.get('/profile/:username', checkNotAuthenticated, (req, res) => {
    const username = req.params.username
    const sql = `SELECT * FROM tb_users ORDER WHERE username ='${username}'`
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }
        const nama = results.rows[0].name
        res.render('profile', {
            title: `Hallo ${capitalize.words(nama)}`,
            layout: "layout/main-layout",
            profile: results.rows,
            msg: req.flash('msg'),
            users: authUser(req.user),
            capitalize: capitalize

        })
    })
})

// Membuat Proses Category Page 
app.get('/category', (req, res) => {
    const sql = "SELECT * FROM forum_category ORDER BY title_category ASC"
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }

        res.render('category', {
            title: "Kategori",
            layout: "layout/main-layout",
            categorys: results.rows,
            msg: req.flash('msg'),
            users: authUser(req.user),
            capitalize: capitalize

        })
    })

})

// Menampilkan query
// Menampilkan semua data category
app.get('/category/:title_category', (req, res) => {
    const title_category = req.params.title_category;
    // Mencari nama yang akan di edit lalu di masukan kedalam input di ejs
    const sql = `SELECT title_post,content, forum_category.title_category, forum_post.date, forum_post.image, tb_users.username FROM forum_post 
    INNER JOIN forum_category ON forum_post.id_category = forum_category.id_category 
    INNER JOIN tb_users ON forum_post.id_user = tb_users.id_user where forum_category.title_category='${title_category}' ORDER BY date ASC`
    pool.query(sql, (error, result) => {
        if (error) {
            throw error
        }
        res.render('detail-category', {
            title: `Kategori ${title_category}`,
            layout: "layout/main-layout",
            forums: result.rows,
            title_category: title_category,
            msg: req.flash('msg'),
            users: authUser(req.user),
            moment: moment,
            capitalize: capitalize

        });
    })
})


// Menampilkan detail data query
app.get('/category/:title_category/post/:title_post', async (req, res) => {
    const title_category = req.params.title_category
    const title_post = req.params.title_post
    const cariIdForum = await getIdForum(title_post)
    const findId = cariIdForum.id_post;
    const ambilIdForum = await getSelectComment(findId)

    const sql = `SELECT forum_post.id_post,tb_users.username,title_post,content,forum_post.date, forum_post.image FROM forum_post INNER JOIN tb_users ON forum_post.id_user = tb_users.id_user WHERE title_post = '${title_post}'`;
    pool.query(sql, (err, result) => {
        res.render('detail-forum', {
            title: `${title_post}`,
            layout: "layout/main-layout",
            post: result.rows[0],
            titleCategory: title_category,
            users: authUser(req.user),
            comments: ambilIdForum,
            moment: moment,
            capitalize: capitalize
        });
    })


})
app.post('/comment', checkNotAuthenticated, async (req, res) => {
    try {
        // Mengambil isi form yang di isikan oleh user

        const comment = req.body.comment;
        const id_post = await req.body.id_post;
        const userId = req.body.id_user;
        const title_category = req.body.title_category;
        const title_post = req.body.title_post;





        //Menggunakan query insert untuk memasukan data atau mengadd data
        const dataAdd = await pool.query(`INSERT INTO public.forum_comment(
            id_user, id_post, comment, date, "time")
            VALUES ( ${userId}, ${id_post}, '${comment}', now(), now())`)
        dataAdd;
        req.flash('msg', `Berhasil menambahkan Commentar`)
        res.redirect(`/category/${title_category}/post/${title_post}`);
    } catch (err) {
        console.error(err.message)
    }

})
app.get('/category/:title_category/post/:title_post/comment/delete/:id_comment', async (req, res) => {


    try {


        const id_comment = req.params.id_comment;
        const deleteComment = await deleteCommentId(id_comment)
        const title_category = req.body.title_category;
        const title_post = req.body.title_post;

        const sql = `DELETE FROM forum_comment WHERE id_comment = '${title_post}'`


        pool.query(sql, (err, result) => {

            if (!id_comment) {
                res.status(404)
                res.send('<h1>404</h1>')
            } else {

                deleteComment;
                req.flash('msg', `Berhasil Melakukan Delete Commentar`)
                res.redirect(`/category/${title_category}/post/${title_post}`);
            }

        })


    } catch (error) {

    }

})



// Proses Delete forum
app.get('/myforum/delete/:title_post', checkNotAuthenticated, async (req, res) => {

    const title_post = req.params.title_post;
    const getIdForums = await getIdForum(title_post);
    const deleteComment = await deleteCommentPosting(getIdForums)

    const sql = `DELETE FROM forum_post WHERE title_post = '${title_post}'`

    const postNamaImage = await getImageName(title_post)
    postNamaImage.image
    pool.query(sql, (err, result) => {
        if (!title_post) {
            res.status(404)
            res.send('<h1>404</h1>')
        } else {
            deleteComment;
            result.rows[0]
            fs.unlinkSync(`./public/image/${postNamaImage.image}`)
            req.flash('msg', `${title_post} berhasil di hapus`)
            res.redirect('/myforum')
        }

    })
})


// Membuat Proses menuju MyForum
app.get('/myforum', checkNotAuthenticated, (req, res) => {

    const sql = `SELECT forum_post.id_post,forum_post.title_post,forum_category.title_category,forum_post.content,forum_post.date,
        forum_post.image,tb_users.username FROM forum_post INNER JOIN forum_category ON forum_post.id_category =
         forum_category.id_category INNER JOIN tb_users ON forum_post.id_user = tb_users.id_user 
        ORDER BY forum_post.date ASC`
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }

        res.render('myforum', {
            title: "My Forum Page",
            layout: "layout/main-layout",
            forums: results.rows,
            msg: req.flash('msg'),
            users: authUser(req.user),
            moment: moment


        })
    })

})

// Tombol Tambah data
// Menampilkan semua data Forum Page
app.get('/myforum/add', checkNotAuthenticated, (req, res) => {

    const sql = "select * from forum_category"
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }
        res.render('add-myforum', {
            users: authUser(req.user),
            title: "Tambah Data Forum",
            layout: "layout/main-layout",
            categorys: results.rows,
            idUser: req.user.id_user,
            msg: req.flash('msg')

        })
    })




})

// Tombol Update Data
// Menampilkan semua data Forum Page
app.get('/myforum/edit/:title_post', checkNotAuthenticated, async (req, res) => {
    const title_post = req.params.title_post;
    const sql = "select * from forum_category"
    const getRowForum = await getSelectAllForum(title_post)

    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }
        const cariNamaCategory = getNameCategory(title_post)

        res.render('edit-myforum', {

            users: authUser(req.user),
            title: "Edit data Forum",
            layout: "layout/main-layout",
            getForum: getRowForum,
            getCategoryName: cariNamaCategory,
            categorys: results.rows,
            msg: req.flash('msg')

        })
    })




})

// Proses Create
// Insert Data Forum
app.post('/myforum', checkNotAuthenticated, kirim.array('image', 1), [
    body('title_post').custom(async (valueTitle) => {

        // Mencari nama yang sama di query
        const queryDuplikat = await pool.query(`SELECT * FROM forum_post WHERE title_post = '${valueTitle}'`)
        const duplikat = queryDuplikat.rows[0]

        if (duplikat) {
            throw new Error(`Forum ${valueTitle} sudah Digunakan! `);

        }

        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {


        res.render('add-myforum', {
            title: 'Form Tambah forum baru',
            layout: 'layout/main-layout',
            errors: errors.array(),
            users: authUser(req.user),
            data: req.body

        });

    } else {
        // addDataContact(req.body);
        // addContact di postgre
        try {
            // Mengambil isi form yang di isikan oleh user
            const category = req.body.category;
            const title_post = req.body.title_post;
            const content = req.body.content;
            const idUser = req.body.id_user;
            let image
            if (!req.files.find((fileE) => fileE.filename)) {
                image = 'null'
            } else {
                image = req.files[0].filename
            }



            //Menggunakan query insert untuk memasukan data atau mengadd data
            const dataAdd = await pool.query(`INSERT INTO forum_post(
                id_category,id_user, title_post,content,image,date,time) values ('${category}','${idUser}','${title_post}','${content}','${image}',now(),now())`)
            dataAdd;
            req.flash('msg', `Berhasil menambahkan Forum dengan judul ${title_post}`)
            res.redirect('/myforum');
        } catch (err) {
            console.error(err.message)
        }

    }


});

// Update setting
// Update Myforum
app.post('/myforum/update', checkNotAuthenticated, kirim.array('image', 1), [
    body('title_post').custom(async (valueTitle, {
        req
    }) => {

        // Mencari nama yang sama di query
        const queryDuplikat = await pool.query(`SELECT * FROM forum_post WHERE title_post = '${valueTitle}'`)
        const duplikat = queryDuplikat.rows[0]

        if (valueTitle !== req.body.title_post && duplikat) {
            throw new Error(`Forum ${valueTitle} sudah Digunakan! `);

        }

        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        res.render('edit-myforum', {
            title: 'Form Ubah Diskusi',
            users: authUser(req.user),
            layout: 'layout/main-layout',
            errors: errors.array(),
            category: req.body
        });

    } else {
        try {
            const oldCategory = req.body.oldCategory
            const oldPost = req.body.oldTitlePost
            const oldContent = req.body.oldContent

            const idForum = req.body.id_post;
            const category = req.body.category;
            const title_post = req.body.title_post;
            const content = req.body.content;
            const idUser = req.body.id_user;
            let image
            if (!req.files.find((fileE) => fileE.filename)) {
                image = 'null'
            } else {
                image = req.files[0].filename
            }

            const newUpdate = await pool.query(`UPDATE public.forum_post
            SET id_category='${category}', title_post='${title_post}', content='${content}', date=now(), image='${image}', "time"=now()
            WHERE id_post=${idForum}`)
            newUpdate;
            req.flash('msg', 'Forum berhasil di ubah')
            res.redirect('/myforum')
        } catch (error) {
            console.log(error)
        }


    }


})


// Proses Delete forum
app.get('/myforum/delete/:title_post', checkNotAuthenticated, async (req, res) => {

    const title_post = req.params.title_post;
    const getIdForums = await getIdForum(title_post);
    const deleteComment = await deleteCommentPosting(getIdForums)

    const sql = `DELETE FROM forum_post WHERE title_post = '${title_post}'`


    pool.query(sql, (err, result) => {
        if (!title_post) {
            res.status(404)
            res.send('<h1>404</h1>')
        } else {
            deleteComment;
            result.rows[0]
            //fs.unlinkSync(`../public/image/${}`);
            req.flash('msg', `${title_post} berhasil di hapus`)
            res.redirect('/myforum')
        }

    })
})




// Menampilkan semua data setting category page
app.get('/setting-category', checkNotAuthenticated, (req, res) => {

    const sql = "SELECT title_category, date  FROM forum_category ORDER BY date ASC"
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }

        res.render('setting-category', {
            title: "Setting Category",
            layout: "layout/main-layout",
            users: authUser(req.user),
            categorys: results.rows,
            msg: req.flash('msg'),
            moment: moment

        })
    })
})

// Proses menuju form tambah category
app.get('/setting-category/add', checkNotAuthenticated, (req, res) => {

    res.render('add-category', {
        title: "Form Sub Kategori",
        layout: "layout/main-layout",
        users: authUser(req),
    })

})

// Proses menuju form tambah category
app.get('/setting-category/edit/:title_category', checkNotAuthenticated, (req, res) => {
    const title_category = req.params.title_category;
    const sql = `SELECT title_category FROM forum_category WHERE title_category ='${title_category}'`
    pool.query(sql, (err, result) => {

        res.render('edit-category', {
            title: "Edit Kategori",
            layout: "layout/main-layout",
            category: result.rows[0],
            users: authUser(req.user),
        })
    })


})
// Update Category
app.post('/setting-category/update', checkNotAuthenticated, [
    body('title_category').custom(async (valueTitle, {
        req
    }) => {
        try {


            // Mencari nama yang sama di query

            const queryDuplikat = await pool.query(`SELECT * FROM forum_category WHERE title_category = '${valueTitle.toLowerCase()}'`)
            const duplikat = queryDuplikat.rows[0]

            if (valueTitle !== req.body.oldCategory && duplikat) {
                throw new Error(`Kategori ${valueTitle} sudah Digunakan! `);

            }

            return true;
        } catch (error) {
            console.log(err)
        }
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        res.render('edit-category', {
            title: 'Form Ubah Kategori',
            layout: 'layout/main-layout',
            errors: errors.array(),
            category: req.body,
            users: authUser(req.user),
        });

    } else {
        const oldCategory = req.body.oldCategory
        const title_category = req.body.title_category

        const newUpdate = await pool.query(`UPDATE forum_category SET title_category = '${title_category}', date=now(), time=now() WHERE title_category = '${oldCategory}'`)
        newUpdate;
        req.flash('msg', 'Data  Kategori berhasil di ubah')
        res.redirect('/setting-category')

    }


})


// Proses Delete User
app.get('/setting-category/delete/:title_category', checkNotAuthenticated, (req, res) => {

    const title_category = req.params.title_category;

    const sql = `DELETE FROM forum_category WHERE title_category = '${title_category}'`


    pool.query(sql, (err, result) => {
        if (!title_category) {
            res.status(404)
            res.send('<h1>404</h1>')
        } else {
            req.flash('msg', `${title_category} berhasil di hapus`)
            res.redirect('/setting-category')
        }

    })
})

// Insert Data category 
app.post('/category', checkAuthenticated, [
    body('title_category').custom(async (valueTitle) => {

        // Mencari nama yang sama di query
        const queryDuplikat = await pool.query(`SELECT * FROM forum_category WHERE title_category = '${valueTitle}'`)
        const duplikat = queryDuplikat.rows[0]

        if (duplikat) {
            throw new Error(`Kategori ${valueTitle} sudah Digunakan! `);

        }

        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {


        res.render('add-category', {
            title: 'Form Tambah Kategori',
            layout: 'layout/main-layout',
            users: authUser(req.user),
            errors: errors.array(),
            data: req.body

        });

    } else {
        try {
            // Mengambil isi form yang di isikan oleh user
            const title = req.body.title_category.toLowerCase();



            //Menggunakan query insert untuk memasukan data atau mengadd data
            const dataAdd = await pool.query(`INSERT INTO forum_category(
                title_category) values ('${title}') `)
            dataAdd;
            req.flash('msg', `Berhasil menambahkan Kategori ${title}`)
            res.redirect('/setting-category');
        } catch (err) {
            console.error(err.message)
        }

    }


});



// Menampilkan semua data user
app.get('/setting-user', checkNotAuthenticated, (req, res) => {

    const sql = "SELECT * FROM tb_users  ORDER BY id_user ASC "
    pool.query(sql, [], (error, results) => {
        if (error) {
            throw error
        }
        res.render('user', {
            title: "Setting User",
            layout: "layout/main-layout",
            tbUser: results.rows,
            users: authUser(req.user),
            msg: req.flash('msg'),
            moment: moment

        })
    })
})


// Proses menuju form tambah User
app.get('/setting-user/add', checkNotAuthenticated, (req, res) => {

    res.render('add-user', {
        title: "Form Tambah User",
        layout: "layout/main-layout",
        users: authUser(req),
    })

})


// Proses Daftar Registrasi user
app.post('/setting-user/register', checkNotAuthenticated, [
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
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {


        res.render('add-user', {
            title: 'Form Tambah Data User',
            layout: 'layout/main-layout',
            errors: errors.array(),
            users: authUser(req.user),
            data: req.body,

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
            req.flash('msg', `Berhasil Menambahkan ${username}`)
            res.redirect('/setting-user');
        } catch (err) {
            console.error(err.message)
        }

    }


});


// Proses menuju form edit User
app.get('/setting-user/edit/:username', checkNotAuthenticated, async (req, res) => {
    const username = req.params.username;
    const cekIdUsername = await getIdUsername(username)

    res.render('edit-user', {
        title: "Form Tambah User",
        layout: "layout/main-layout",
        users: authUser(req.user),
        selectUser: cekIdUsername
    })

})

// Proses Edit User
app.post('/setting-user/update', checkNotAuthenticated, kirim.array('image', 1), [
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
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {


        res.render('edit-user', {
            title: 'Form Edit User',
            layout: 'layout/main-layout',
            errors: errors.array(),
            users: authUser(req.user),
            data: req.body,

        });

    } else {
        // addDataContact(req.body);
        // addContact di postgre
        try {
            // Mengupdate isi form yang di isikan oleh user
            const oldUsername = req.body.oldUsername
            const oldNama = req.body.oldNama
            const oldEmail = req.body.oldEmail
            const oldImage = req.body.oldImage
            const id_user = req.body.id_user
            let image
            if (!req.files.find((fileE) => fileE.filename)) {
                image = 'null'
            } else {
                image = req.files[0].filename
            }

            const username = req.body.username;
            const nama = req.body.nama;
            const email = req.body.email;
            const password = req.body.password;
            const passwordhash = bcrypt.hashSync(password, 10);
            //Menggunakan query insert untuk memasukan data atau mengadd data
            const updateData = await pool.query(`UPDATE public.tb_users
            SET  username='${username}', nama='${nama}', email='${email}', password='${passwordhash}', date=now(), "time"=now(), image='${image}'
            WHERE id_user='${id_user}'`)
            updateData;
            req.flash('msg', `Berhasil mengubah data ${username}`)
            res.redirect('/setting-user');
        } catch (err) {
            console.error(err.message)
        }

    }


});

// Proses Delete User
app.get('/setting-user/delete/:username', checkNotAuthenticated, async (req, res) => {

    const username = req.params.username;
    const cekIdUsername = await getIdUsername(username)
    const hapusCommentUser = await deleteCommentPosting(cekIdUsername.id_user)
    const hapusPostingUser = await deletePostingUser(cekIdUsername.id_user)

    const sqlUser = `DELETE FROM tb_users WHERE username = '${username}'`


    pool.query(sqlUser, (err, result) => {
        if (!username) {
            res.status(404)
            res.send('<h1>404</h1>')
        } else {

            hapusCommentUser
            hapusPostingUser
            result.rows[0]
            req.flash('msg', `${username} berhasil di hapus`)
            res.redirect('/setting-user')
        }





    })
})

// Myforum 


async function getIdCategory(category) {
    try {
        const sql = `select id_category from forum_category WHERE title_category ='${category}'`
        const query = await pool.query(sql)
        category = query.rows[0]
    } catch (err) {

    }
    return category



}


async function getSelectComment(req) {
    try {
        const sql = `SELECT forum_comment.id_comment,comment,forum_comment.date, forum_comment.time, tb_users.username,id_post FROM forum_comment INNER JOIN tb_users ON forum_comment.id_user = tb_users.id_user  WHERE id_post='${req}'`
        const query = await pool.query(sql)
        req = query.rows

    } catch (err) {
        console.error(err)

    }

    return req

}

async function getIdForum(idForum) {
    try {
        const sql = `SELECT id_post FROM public.forum_post WHERE title_post ='${idForum}'`
        const query = await pool.query(sql)
        idForum = query.rows[0]




    } catch (err) {
        console.error(err);

    }

    return idForum;

}

async function getSelectAllForum(titleForum) {
    try {
        const sql = `SELECT * FROM public.forum_post WHERE title_post ='${titleForum}'`
        const query = await pool.query(sql)
        titleForum = query.rows[0]




    } catch (err) {
        console.error(err);

    }

    return titleForum;

}

// Mencari id user
async function getIdUsername(idPostUsername) {
    try {
        const sql = `SELECT * FROM tb_users WHERE username ='${idPostUsername}' `
        const query = await pool.query(sql)
        idPostUsername = query.rows[0]




    } catch (err) {
        console.error(err);

    }

    return idPostUsername;
}
// Mencari postingan user
async function getIdPostUser(idUser) {
    try {
        const sql = `SELECT * FROM forum_post WHERE id_post ='${idUser}'`
        const query = await pool.query(sql)
        idUser = query.rows[0]




    } catch (err) {
        console.error(err);

    }

    return idUser;
}


// Melakukan delete di postingan berdasarkan user_id
async function deletePostingUser(idUser) {
    try {
        const sql = `DELETE FROM forum_post WHERE id_user = '${idUser}'`
        const query = await pool.query(sql)
        idUser = query.rows[0]




    } catch (err) {
        console.error(err);

    }

    return idUser;
}


// Melakukan delete berdasarkan user
async function deleteCommentPosting(idUser) {
    try {
        const sql = `DELETE FROM forum_comment WHERE id_user = '${idUser}'`
        const query = await pool.query(sql)
        idUser = query.rows[0]




    } catch (err) {
        console.error(err);

    }

    return idUser;
}

// Melakukan delete id_comment
async function deleteCommentId(idComment) {
    try {
        const sql = `DELETE FROM forum_comment WHERE id_comment = '${idComment}'`
        const query = await pool.query(sql)
        idComment = query.rows[0]




    } catch (err) {
        console.error(err);

    }

    return idComment;
}

async function getImageName(imageName) {
    try {
        const sql = `SELECT * FROM forum_post WHERE title_post ='${imageName}'`
        const query = await pool.query(sql)
        imageName = query.rows[0]




    } catch (err) {
        console.error(err);

    }

    return imageName;
}

function getNameCategory(idCategory) {
    pool.query(`SELECT forum_category.title_category FROM forum_post INNER JOIN forum_category ON forum_post.id_category = forum_category.id_category WHERE title_post ='${idCategory}'`, (error, results) => {
        if (error) {
            throw error
        }
        idCategory = results.rows[0];

    })
    return idCategory
}



// function checkAuthenticated(req, res, next) {

//     if (req.isAuthenticated()) {
//         return res.redirect('/');

//     }
//     next();
// }
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect("/");
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/users/login");
}

// function checkNotAuthenticated(req, res, next) {
//     if (req.isAuthenticated()) {
//         return next();
//     }
//     res.redirect('/users/login')

// }

app.use('/', (req, res) => {
    res.status(404)
    res.send('Page Not found : 404')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})