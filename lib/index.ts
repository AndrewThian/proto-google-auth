import express from "express";
import { API } from "./api";
import speakeasy from "speakeasy";
import path from "path"

export type User = {
    firstname: string
    lastname: string
    email: string
    password: string
    twofa?: {
        secret: string
        tempSecret: string
        dataURL: string
        otpURL: string
    }
}

class Server {
    public app: express.Application;
    public router: express.Router;
    public user: User;

    constructor () {
        this.user = {
            firstname: "andrew",
            lastname: "thian",
            email: "andrewthian@gmail.com",
            password: "123456"
        }

        this.app = express();
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.json());
        this.router = new API(this.user).router;
        this.routes();
    }

    routes() {
        this.app.get("/", (req, res) => {
            res.sendFile(path.join(__dirname + "/../template/index.vue.html"))
        })
        this.app.use("/twofactor", this.router)
        this.app.post("/login", (req, res) => {
            console.log("BODY", req.body)
            /**
             * login needs to support both 2FA and normal login:
             * 1. check if the user has enabled 2FA
             * 2. if no 2FA, use normal login
             */
            if (!this.user.twofa || !this.user.twofa.secret) {
                // normal login
                if (this.authenticated(req.body)) {
                    return res.send("SUCCESS")
                }
                return res.status(400).send("invalid email or password")
            } else {
                // 2FA enabled
                if (!this.authenticated(req.body)) {
                    return res.status(203).send("Invalid email or password")
                }
                const otp = req.headers["x-otp"]
                if (!otp) {
                    return res.status(206).send("Please enter otp to continue")
                }
                // validate otp token
                const verified = speakeasy.totp.verify({
                    /**
                     * this is after setting up the 2FA, which means we aren't
                     * using the temporary secret anymore.
                     */
                    secret: this.user.twofa.secret,
                    encoding: "base32",
                    token: (otp as string)
                })
                if (verified) {
                    // authenticated user
                    return res.send("SUCCESS")
                } else {
                    return res.status(400).send("invalid OTP")
                }
            }
        })
    }

    authenticated(user: User): boolean {
        return user.email === this.user.email && user.password === this.user.password
    }
}

const { app } = new Server()

app.listen(3000, () => {
    console.log("App running on 3000")
})