express = require("express");
const app = express();
cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

app.use(express.json());
app.use(cors());
const port = process.env.PORT || 7000;

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(new URL(`http://localhost:3000/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    db = client.db("tutorflow");
    const tutorCollection = db.collection("tutors");
    const newTutorCollection = db.collection("newTutors");
    const bookingCollection = db.collection("bookings");

    app.post("/tutors", async (req, res) => {
      try {
        const newTutor = req.body;

        // save in tutors collection
        const tutorResult = await tutorCollection.insertOne(newTutor);

        // save in newTutors collection
        const newTutorResult = await newTutorCollection.insertOne(newTutor);

        res.send({
          success: true,
          tutorResult,
          newTutorResult,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to add tutor",
        });
      }
    });

    app.get("/newTutors", async (req, res) => {
      const result = await newTutorCollection.find().toArray();
      res.send(result);
    });

    app.get("/tutors/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await tutorCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/features", async (req, res) => {
      const cursor = tutorCollection.find().limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    app.get("/booking/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.send(result);
    });

    app.delete("/newTutors/:id", async (req, res) => {
      const { id } = req.params;

      const result = await newTutorCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    app.delete("/tutors/:id", async (req, res) => {
      const { id } = req.params;

      const result = await tutorCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    app.patch("/booking/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { status },
        },
      );

      res.send(result);
    });

    app.patch("/tutors/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const updatedTutor = req.body;

        // update tutors collection
        const tutorResult = await tutorCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: updatedTutor,
          },
        );

        // update newTutors collection
        const newTutorResult = await newTutorCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: updatedTutor,
          },
        );

        res.send({
          success: true,
          tutorResult,
          newTutorResult,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to update tutor",
        });
      }
    });

    //Booking update slot api start

    app.patch("/tutors/slot/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const tutor = await tutorCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!tutor) {
          return res.status(404).send({
            success: false,
            message: "Tutor not found",
          });
        }

        const remainingSlot = Number(tutor.totalSlot);

        if (remainingSlot <= 0) {
          return res.status(400).send({
            success: false,
            message: "No slot available",
          });
        }

        const today = new Date();
        const closeDate = new Date(tutor.sessionCloseDate);

        if (closeDate < today) {
          return res.status(400).send({
            success: false,
            message: "Session closed",
          });
        }

        const result = await tutorCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              totalSlot: remainingSlot - 1,
            },
          },
        );

        res.send({
          success: true,
          message: "Slot updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          success: false,
          message: "Failed to update slot",
          error: error.message,
        });
      }
    });

    //Booking update slot api end

    app.get("/tutors", async (req, res) => {
      try {
        const search = req.query.search || "";
        const sessionStartDate = req.query.sessionStartDate;
        const sessionCloseDate = req.query.sessionCloseDate;

        let query = {};

        // TEXT SEARCH
        if (search) {
          query.$or = [
            {
              tutorName: { $regex: search, $options: "i" },
            },
            {
              subject: { $regex: search, $options: "i" },
            },
          ];
        }

        // DATE FILTER START
        if (sessionStartDate) {
          query.sessionStartDate = {
            $gte: sessionStartDate,
          };
        }

        // DATE FILTER END
        if (sessionCloseDate) {
          query.sessionCloseDate = {
            $lte: sessionCloseDate,
          };
        }

        const result = await tutorCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });

    // Search tutors api end

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});
