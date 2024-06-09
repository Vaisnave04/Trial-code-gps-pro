const express = require("express");
const User = require("../model");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils");
const verifyToken = require("../middleware");
const nodemailer = require("nodemailer");

const router = express.Router();

router.get("/test", (req, res) =>
    res.json({ message: `Api Testing Successful` }));

router.post("/user", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        return res.status(201).json({ message: 'User Created' });

    }
    res.status(404).json({ message: "User already Exists" });

});
router.post("/authenticate", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: `User not found` });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: `Incorrect Password` });
    }
    const token = generateToken(user);
    res.json({ token });

});
router.get("/data", verifyToken, (req, res) => {
    res.json({ message: `Welcome, ${req.user.email}! This is protected data` });
});
router.post("/reset-password", async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: `User not found` });
    }
    const token = Math.random().toString(36).slice(-8);
    user.restPasswordToken = token;
    user.restPasswordExpires = Date.now() + 3600000;
    await user.save();
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "vaisnavei@karunya.edu.in",
            pass: "fvlj yxef xlbz oipi"
        },
    });
    const message = {
        from: "vaisnavei@karunya.edu.in",
        to: user.email,
        subject: "Password rest request",
        text: `You are receiving this email beacuse you (or someone else) has reuested password reset for your account. \n \n Please use the token to reset : ${token}`
    };
    transporter.sendMail(message, (err, info) => {
        if (err) {
            return res.status(404).json({ message: `Try again` });
        }
        res.status(200).json({ message: "Password reset mail sent" + info.response });

    });

});
router.post("/reset-password/:token", async(req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
        restPasswordToken: token,
        restPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
        return res.status(404).json({ message: `Invalid token` });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    user.password = hashPassword;
    user.restPasswordToken= null;
    user.restPasswordExpires = null;
    await user.save();
    res.json({ message: `Password reset successful` });
});

module.exports = router;

