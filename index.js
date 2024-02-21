const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://car-doctor-535cf.web.app",
      "https://car-doc.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// mongo code
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@miles12.5mxpsru.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// my middleware
// just check
const logger = async (req, res, next) => {
  // console.log("called working:", req.hostname, req.originalUrl);
  next();
};
// just check end
const verifyTokenFirst = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log("got middleware token:", token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    // error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized" });
    }
    // console.log("got token finally:", decoded);
    req.decodedUser = decoded;
    next();
    // if token is valid then it would be decoded
  });
};
// my middleware end

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings");
    // main code here
    // auth related api
    app.post("/jwt", async (req, res) => {
      const getData = req.body;
      // console.log(getData);
      const token = jwt.sign(getData, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          // sameSite: "Lax",
        })
        .send({ success: true });
    });
    // services related api
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const paramsId = req.params.id;
      const query = { _id: new ObjectId(paramsId) };
      const options = {
        projection: { service_id: 1, title: 1, img: 1, price: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // bookings part
    app.post("/bookings", async (req, res) => {
      const dataFromClient = req.body;
      const result = await bookingCollection.insertOne(dataFromClient);
      res.send(result);
    });

    app.get("/bookings", verifyTokenFirst, async (req, res) => {
      // console.log(req.query.email);
      // console.log("got that token:", req.cookies.token);
      // console.log("got from my middleware", req.decodedUser.email.toLowerCase());
      if (
        req.query.email.toLowerCase() !== req.decodedUser.email.toLowerCase()
      ) {
        return res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const paramsId = req.params.id;
      const getUpdateData = req.body;
      const filter = { _id: new ObjectId(paramsId) };
      const updateDoc = {
        $set: {
          status: getUpdateData.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const ParamsId = req.params.id;
      const query = { _id: new ObjectId(ParamsId) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    // main code here end
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// mongo code end

app.get("/", (req, res) => {
  res.send("CAR DOCTOR RUNNING");
});

app.listen(port, () => {
  console.log(`CAR DOCTOR RUNNING ON PORT ${port}`);
});
