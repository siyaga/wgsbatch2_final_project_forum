const LocalStrategy = require("passport-local").Strategy;
const pool = require('./db');
const bcrypt = require('bcrypt');

function initialize(passport) {
    const autheticateUser = (username, password, done) => {
        pool.query('SELECT * FROM tb_users WHERE username = $1', [username.toLowerCase()], (err, result) => {
            if (err) {
                throw err;
            }


            if (result.rows.length > 0) {
                const user = result.rows[0];

                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) {
                        console.log(err);
                    }
                    if (isMatch) {
                        pool.query(`INSERT INTO public.logs(
                            id_user, username, nama, activity)
                     VALUES ( ${user.id_user}, '${user.username}','${user.nama}', '${user.username} Berhasil Login')`);
                        return done(null, user, {

                            message: `Berhasil Login Selemat Datang ${user.username}`
                        });
                    } else {
                        return done(null, false, {
                            message: "Password is incorret"
                        });
                    }
                });
            } else {
                // tidak ada user
                return done(null, false, {
                    message: "Username is not registered"
                });
            }
        })
    }

    passport.use(
        new LocalStrategy({
                usernameField: 'username',
                passwordField: 'password',
            },
            autheticateUser
        )
    );

    passport.serializeUser((user, done) => done(null, user.id_user));

    passport.deserializeUser((id_user, done) => {
        pool.query(
            `SELECT * FROM tb_users WHERE id_user =$1`, [id_user], (err, result) => {
                if (err) {
                    return done(err);
                }
                return done(null, result.rows[0])
            });
    });
}

module.exports = initialize;