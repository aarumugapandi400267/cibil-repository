const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "aarumugapandi762004@gmail.com", // Replace with your email
        pass: "whdt pdhg irca kqha" // Use App Password if 2FA is enabled
    }
});

const uri = "mongodb+srv://aarumugapandi762004:APandi400267@verse.sigin.mongodb.net/?appName=Verse";

const app = express();
require("dotenv").config()
app.use(express.json()); // This allows Express to parse JSON request bodies

SECRET = "salesforcetoken"

const PORT = 3001;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}

connectDB();

const database = client.db("Cibil"); // Database name

app.get("/",(req,res)=>{
    res.json({message:"Ok"})
})

app.post("/register", async (req, res) => {
    try {
        const { user, password } = req.body;
        // Validate input
        if (!user || !password) {
            return res.status(400).json({ message: "user and password are required" });
        }


        const collection = database.collection("users");

        const existingUser = await collection.findOne({ user });
        if (existingUser) {
            return res.status(400).json({ message: "user already exists" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await collection.insertOne({
            user: user,
            password: hashedPassword,
        });

        const token = jwt.sign({ userId: newUser.insertedId, user }, SECRET, {
            expiresIn: "1h",
        });

        res.status(201).json({ message: "User registered successfully", token });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { user, password } = req.body;

        if (!user || !password) {
            return res.status(400).json({ message: "User and password are required" });
        }

        const database = client.db("Cibil");
        const collection = database.collection("users");

        const existingUser = await collection.findOne({ user });
        if (!existingUser) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: existingUser._id, user }, SECRET, {
            expiresIn: "1h",
        });

        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const authenticate = (req, res, next) => {
    const token = req.header("Authorization");
  
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }
  
    try {
      const decoded = jwt.verify(token, SECRET);
      req.user = decoded; // Attach user data to the request
      next();
    } catch (error) {
      res.status(403).json({ message: "Invalid or expired token" });
    }
  };
  

  app.get("/:pan", authenticate, async (req, res) => {
    try {
        const { pan } = req.params;
        const collection = database.collection("cibilscore");

        const result = await collection.findOne({ pan: pan });

        if (!result) {
            return res.status(404).json({ message: "Data not found" });
        }

        // Ensure email exists in the database result
        if (!result.email) {
            return res.status(400).json({ message: "Email ID not found for this PAN" });
        }

        // Generate a 6-digit random OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Email options
        const mailOptions = {
            from: "aarumugapandi762004@gmail.com",
            to: result.email, 
            subject: "Your OTP Code",
            text: `Your OTP code is: ${otp}. It is valid for 10 minutes.`
        };

        // Send OTP via email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ message: "Failed to send OTP" });
            }
            console.log("Email sent:", info.response);

            // Attach OTP in response
            res.json({ ...result, otp:otp+"" });
        });

    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
