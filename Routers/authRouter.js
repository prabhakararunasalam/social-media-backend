import express from "express";
import { forgotPassword, getMe, loginUser, logoutUser, registerUser, resetPassword } from "../Controllers/authController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";


const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", authMiddleware ,getMe);
router.post("/logout", logoutUser);
export default router;