import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./Config/dbConfig.js";
import authRoute from "./Routers/authRouter.js";
import postRoute from "./Routers/postRouter.js";
import userRoute from "./Routers/userRouter.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors(
    {
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    }
));
app.use(cookieParser());

connectDB();

app.get("/", (req, res) => {
    res.send("welcome to backend");
});

app.use("/api/auth", authRoute);
app.use("/api/posts", postRoute);
app.use("/api/users", userRoute);

const Port = process.env.PORT || 4000;

app.listen(Port, () => console.log(`server running on port ${Port}`));