import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import cors from "cors";
import { removePortfolioExcelSheet } from "./src/utils/removePortfolioExcelSheets.js";
import { removeActivityHistoryPdf } from "./src/utils/removeActivityHistoryPdf.js";

const allowedOrigins = [
    process.env.FRONTEND_LINK || "http://localhost:5173"
];
const app = express();
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // if using cookies or auth headers
  })
);
app.use(express.json());
app.use(cookieParser());

import userRouter from "./src/routes/user.routes.js";
import dashBoardRouter from "./src/routes/dashBoard.routes.js";
import aiInsightRouter from "./src/routes/aiInsight.routes.js";
import portfolioRouter from "./src/routes/portfolio.routes.js";
app.use("/api/v1/users", userRouter);
app.use("/api/v1/dashboard", dashBoardRouter);
app.use("/api/v1/ai-insight", aiInsightRouter);
app.use("/api/v1/portfolio",portfolioRouter);
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Handle multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File size too large. Maximum allowed size is 500KB.",
            });
        }
        return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`,
        });
    }

    console.error(err);
    return res.status(500).json({
        success: false,
        message: "Something went wrong.",
    });
});

export { app };
