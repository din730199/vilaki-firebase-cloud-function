const functions = require('firebase-functions');
const admin = require('firebase-admin')
const express = require('express')
//const app = express()
const app1 = express()
const app = express()
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
const baseUrl = "https://fcm.googleapis.com/fcm/send";
const request = require("request-promise");
const privateKey = require('./db/privateKey')
const {
    check,
    validationResult
} = require('express-validator');
const body_parser = require('body-parser');
app.use(body_parser.json());
//Sign Up
app.post('/signUp', async (req, res) => {
    try {
        let {
            numberPhone,
            password,
            fullname,
            role,
            fcmToken
        } = req.body;
        console.log(password)
        let salt = await bcrypt.genSaltSync(10);
        let hashPass = await bcrypt.hashSync(password, salt);

        const data = {
            numberPhone,
            password: hashPass,
            fullname,
            role: db.doc(`/roles/${role}`),
            status: 0,
            provinces: '',
            languages: [],
            fcmToken,
            email: '',
            diaChi: '',
            countries: '',
            avatar: 'https://firebasestorage.googleapis.com/v0/b/vilaki-52825.appspot.com/o/avatar-png-green.png?alt=media&token=5d71b67b-6091-485c-bc87-4c9b6000959c',
            rating: [],
            order: 0
        }
        let UserCheck = await db.collection('users').add(data);
        let check = await db.collection('typetranslators').get()
        check.forEach(
            (doc) => {
                db.collection('users').doc(UserCheck.id).collection('typetranslator').doc(doc.id).set({
                    price: 0,
                    status: false
                });
            }
        );

        if (UserCheck) {
            jwt.sign({
                data: {
                    numberPhone,
                }
            }, privateKey, {
                expiresIn: '24h'
            }, (err, token) => {
                if (err) throw err;
                console.log(token);
                if (!token) {
                    return (res.json({
                        errors: [{
                            msg: "Đăng ký thất bại"
                        }],
                        status: 201
                    }))
                }
                res.json({
                    token: token,
                    id: UserCheck.id,
                    status: 200
                })

            });
        }
    } catch (error) {
        console.log(error)
        res.json({
            errors: [{
                msg: 'Sign up error !'
            }],
            status: 205
        });
    }
})
//checkPhone
app.post('/checkPhone', async (req, res) => {
    try {
        let {
            numberPhone
        } = req.body;

        let CheckUser = await db.collection('users').where("numberPhone", "=", numberPhone).get();

        const fights = [];
        CheckUser.forEach(
            (doc) => {
                fights.push({
                    id: doc.id,
                    data: doc.data()
                });
            }
        );
        console.log(fights);
        console.log('123');
        const a = [];
        if (JSON.stringify(fights) === JSON.stringify(a)) {
            res.json({
                status: 200
            })
        } else {

            res.json({
                errors: [{
                    msg: "Số điện thoại bị trùng"
                }],
                status: 201
            })
        }

    } catch (error) {
        console.log(error)
        res.json({
            errors: [{
                msg: 'Sign up error !'
            }],
            status: 205
        });
    }
})
//Sign In
app.post('/signIn', async (req, res, next) => {
    try {
        let {
            numberPhone,
            password
        } = req.body;

        let CheckUser = await db.collection('users').where("numberPhone", "=", numberPhone).get();

        const fights = [];
        CheckUser.forEach(
            (doc) => {
                fights.push({
                    id: doc.id,
                    data: doc.data()
                });
            }
        );
        console.log(fights);
        console.log('123');

        if (CheckUser) {
            if (bcrypt.compareSync(password, fights[0].data.password)) {
                jwt.sign({
                    data: {
                        numberPhone,
                        id: fights[0].id,
                        role: fights[0].data.role._path.segments[1]
                    }
                }, privateKey, {
                    expiresIn: '24h'
                }, (err, token) => {
                    if (err) throw err;
                    console.log(token);
                    if (token) {
                        res.status(200).json({
                            token,
                            id: fights[0].id,
                            role: fights[0].data.role._path.segments[1],
                            status: 200
                        })
                    } else {
                        res.status(201).json({
                            errors: [{
                                msg: "Username or password wrong"
                            }],
                            status: 201
                        })
                    }
                });
            } else {
                res.status(201).json({
                    errors: [{
                        msg: "Username or password wrong"
                    }],
                    status: 201
                })
            }
        } else {
            res.status(201).json({
                errors: [{
                    msg: "Username or password wrong"
                }],
                status: 201
            })
        }

    } catch (error) {
        console.log(error)
        res.json({
            errors: [{
                msg: 'Username or password wrong'
            }],
            status: 205
        });
    }
})

//addPosts
app.post('/addPosts', async (req, res, next) => {
    try {
        const {
            title,
            companyName,
            vacancies,
            locationWork,
            salary,
            email,
            users
        } = req.body;

        const Posts = {
            title,
            companyName,
            vacancies,
            locationWork: db.doc(`/provinces/${locationWork}`),
            salary,
            email,
            users: db.doc(`/users/${users}`)
        }

        let Check = await db.collection('posts').add(Posts)
        if (Check) {

            setTimeout(async function () {
                let checkDel = await db.collection('posts').doc(Check.id).delete();
            }, 604800000);

            res.json({
                msg: 'Thêm thành công',
                status: 200
            })
        } else {
            res.json({
                errors: [{
                    msg: "Thêm thất bại"
                }],
                status: 201
            })
        }

    } catch (error) {
        console.log(error);
        res.json({
            errors: [{
                msg: "Server errors"
            }],
            status: 205
        })
    }
})

app1.post("/push", async (req, res) => {
    let {
        key,
        body,
        title,
        fcmToken,
        topic
    } = req.body;
    console.log(req.body);

    const notiResult = await pushNotification(
        key,
        body,
        title,
        fcmToken,
        topic
    );
    res.send(notiResult);
});

async function pushNotification(key, body, title, fcmToken, topic) {
    try {

        const htmlResult = await request.post({
            uri: `${baseUrl}`,
            json: {

                to: fcmToken ? fcmToken : `/topics/${topic}`,
                notification: {
                    body: `${body}`,
                    title: `${title}`
                },
                data: {
                    body: `${body}`,
                    title: `${title}`
                },
                sound: 'default',
                time_to_live: 2419200,
                badge: 1
            },
            headers: {
                "Content-Type": "application/json",
                Authorization: `key=${key}`
            }
        });
        return htmlResult;
    } catch (error) {
        return {
            mgs: "error"
        };
    }
}

app.get('/', (req, res) => {
    res.send('Vilaki-Cloud-Function')
})

app1.get('/', (req, res) => {
    res.send('Vilaki-Cloud-Function')
})

app1.post('/checkStatus', (req, res) => {
    try {
        let {
            id,
            token
        } = req.body;
        let dem = 0;
        let set = setInterval(() => {
            if (dem > 50000) {
                db.collection('bills').doc(id).update({
                    status: -1
                })
                clearInterval(set);
            } else {

                dem = dem + 1000;
            }
            db.collection('bills').doc(id).onSnapshot((data) => {
                console.log(data.data().status);

                if (data.data().status !== 0) {
                    clearInterval(set);
                }
            });
        }, 1000)
    } catch (error) {
        console.log(error);
        res.json({
            errors: [{
                msg: "Server errors"
            }],
            status: 205
        })
    }
})

app.post('/changePassword',async (req, res) => {
    try {
        let {
            id,
            oldPassword,
            newPassword
        } = req.body;


        let check =await db.collection('users').doc(id).get()
            console.log(check.data().password);

            if (check) {
                if (bcrypt.compareSync(oldPassword, check.data().password)) {
                    let salt = await bcrypt.genSaltSync(10);
                    let hashPass = await bcrypt.hashSync(newPassword, salt);
                    db.collection('users').doc(id).update({
                        password: hashPass
                    })
                    res.json({
                        msg: 'Thành công',
                        status: 200
                    })
                } else {
                    res.status(201).json({
                        errors: [{
                            msg: "Password wrong"
                        }],
                        status: 201
                    })
                }
            } 

    } catch (error) {
        console.log(error)
        res.json({
            errors: [{
                msg: 'Error !'
            }],
            status: 205
        });
    }
})

const api = functions.region('asia-east2').https.onRequest(app)
const checkBill = functions.region('asia-east2').https.onRequest(app1)

module.exports = {
    api,
}