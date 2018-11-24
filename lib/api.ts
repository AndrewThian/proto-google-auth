import QRcode from "qrcode";
import speakeasy from "speakeasy";
import express from "express";
import { Router } from "express";
import { User } from ".";

/**
 * we need 5 routes
 * 0. login API
 * 1. enable 2fa auth for user
 * 2. one-time verification
 * 3. 2fa setup details
 * 4. disable 2fa
 */

export class API {
    public router: Router;
    user: User
    
    constructor(user: User) {
        this.router = Router(); 
        this.user = user;
        this.routes();
    }

    routes(): void {
        // setup 2fa for user log in
        this.router.post("/setup", async (req: express.Request, res: express.Response) => {
            /**
             * TOTP is generated base on the combination of secret key and current time
             * the secret key is usually a random base32 enconded string.
             * the speakeasy library already has a #generateSecret function to generate
             */
            const secret = speakeasy.generateSecret({ length: 10 })
            console.log(secret)
            /**
             * the #generateSecret returns a otpath for google-authenticator
             * https://github.com/speakeasyjs/speakeasy/blob/cb58351b7eb829719dbee2df2ede53d97721ef6d/index.js#L620
             * it can be used generate a QRcode
             */
            QRcode.toDataURL(secret.otpauth_url, (err, dataURL) => {
                if (err) {
                    res.status(400).end("ERR")
                    return
                }
                /**
                 * store logged in user, generally this would be written to a database.
                 * or a session store to cache the temporary secret...
                 * we don't store the secret yet because the user has yet to verify
                 * after verification, we store the temporary secret as permanent
                 */
                this.user.twofa = {
                    secret: "",
                    tempSecret: secret.base32,
                    dataURL,
                    otpURL: secret.otpauth_url
                }
                /**
                 * generally, the process of storing a temp secret and permanent is done
                 * so via using Redis and a database of your choice.
                 */
                return res.json({
                    message: "Verification of OTP",
                    ...this.user.twofa
                })
            })
        })

        this.router.post("/verify", (req, res) => {
            /**
             * we're pulling the temp secret from the user store
             * again this should be done in a temp cache like redis or a db
             */
            const verified = speakeasy.totp.verify({
                secret: this.user.twofa.tempSecret,
                encoding: "base32",
                token: req.body.token
            })
            if (verified) {
                this.user.twofa.secret = this.user.twofa.tempSecret
                return res.send("2FA auth enabled")
            }
            return res.status(400).send("invalid token")
        })

        // show 2FA details
        this.router.get("/setup", (req, res) => {
            if (this.user.twofa) {
                return res.json(this.user.twofa)
            }
            return res.status(404).send("ERR")
        })

        // delete 2FA details
        this.router.delete("/setup", (req, res) => {
            this.user.twofa = null;
            res.send("OK")
        })
    }
}