const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const ws = require('ws');


dotenv.config();
// console.log(process.env.MONGO_URL)
async function connectToMongoDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB successfully');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        throw err;
    }
}
connectToMongoDB();

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();

app.use(express.json());

app.use(cookieParser());

app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

app.get('/test', (req, res) => {
    res.json('test ok');
});

app.get('/profile', (req, res) => {
    const token = req.cookies?.token;

    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            res.json(userData)
        })

    } else {
        res.status(401).json('no token');
    }
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
                res.cookie('token', token, { sameSite: 'none', secure: true }).json({
                    id: foundUser._id,
                    username
                });
            });
        }
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
        const createdUser = await User.create({
            username: username,
            password: hashedPassword
        });
        jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
                id: createdUser._id,
                username,
            });
        })
    } catch (err) {
        if (err) throw err;
        res.status(500).json(err);
    }
});

const server = app.listen(4000);

const wss = new ws.WebSocketServer({ server })
wss.on('connection', (connection, req) => {
    // console.log('connected');
    // connection.send('hello welcome to the chat')
    // console.log(req.headers)

    //read username and id from the cookie for this connection
    const cookies = req.headers.cookie;
    if (cookies){
        const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
        // console.log(tokenCookieString)
        if(tokenCookieString){
            const token = tokenCookieString.split('=')[1];
            if(token){
                // console.log(token);
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if(err) throw err;
                    // console.log(userData);
                    const {userId, username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                })
            }
        }
    }

    connection.on('message', (message) => {

        //  console.log(isBinary ? message.toString() : message)
        //  console.log(typeof message);
        //  console.log(message.toString());
         const messageData = JSON.parse(message.toString());
         console.log({ev,messageData})
        //  console.log(messageData)
        const {recipient, text} = messageData;
        if(recipient && text){
            [...wss.clients]
            .filter(c => c.userId === recipient)
            .forEach(c => c.send(JSON.stringify({text, sender:connection.userId})));
        }
    });


    // console.log([...wss.clients].map(c => c.username));

    //notify everyone about online people (when someone connects)
    [...wss.clients].forEach(client => {
        client.send(JSON.stringify(
            {
                online: [...wss.clients].map(c => ({userId:c.userId, username:c.username}))
            }
        ))
    })


});