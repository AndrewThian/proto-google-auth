"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const api_1 = require("./api");
const speakeasy_1 = __importDefault(require("speakeasy"));
const path_1 = __importDefault(require("path"));
class Server {
    constructor() {
        this.user = {
            firstname: "andrew",
            lastname: "thian",
            email: "andrewthian@gmail.com",
            password: "123456"
        };
        this.app = express_1.default();
        this.router = new api_1.API(this.user).router;
        this.routes();
    }
    routes() {
        this.app.get("/", (req, res) => {
            res.sendFile(path_1.default.join(__dirname + "/../template/index.react.html"));
        });
        this.app.use("/2fa", this.router);
        this.app.post("/login", (req, res) => {
            /**
             * login needs to support both 2FA and normal login:
             * 1. check if the user has enabled 2FA
             * 2. if no 2FA, use normal login
             */
            if (!this.user.twofa || !this.user.twofa.secret) {
                // normal login
                if (this.authenticated(req.body.user)) {
                    return res.send("SUCCESS");
                }
                return res.status(400).send("invalid email or password");
            }
            else {
                // 2FA enabled
                if (!this.authenticated(req.body.user)) {
                    return res.status(203).send("Invalid email or password");
                }
                const otp = req.headers["x-otp"];
                if (!otp) {
                    return res.status(206).send("Please enter otp to continue");
                }
                // validate otp token
                const verified = speakeasy_1.default.totp.verify({
                    /**
                     * this is after setting up the 2FA, which means we aren't
                     * using the temporary secret anymore.
                     */
                    secret: this.user.twofa.secret,
                    encoding: "base32",
                    token: otp
                });
                if (verified) {
                    // authenticated user
                    return res.send("SUCCESS");
                }
                else {
                    return res.status(400).send("invalid OTP");
                }
            }
        });
    }
    authenticated(user) {
        return user.email === this.user.email && user.password === this.user.password;
    }
}
const { app } = new Server();
app.listen(3000, () => {
    console.log("App running on 3000");
});
//# sourceMappingURL=index.js.map