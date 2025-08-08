const express = require('express')
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5012;
require('dotenv').config();

// middleWar
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_PASS}@cluster0.hl3uycw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        // create collection inDB
        const queriesCollection = client.db('productRecommendation').collection('queries');
        const recommendationCollection = client.db('productRecommendation').collection('recommendation');

        
        // the recommendation count save in DB is string . so if i change this i need to convert it as number or INT this is have have done here
        
        await queriesCollection.updateMany(
            { recommendationCount: { $type: "string" } },
            [
                {
                    $set: {
                        recommendationCount: { $toInt: "$recommendationCount" }
                    }
                }
            ]
        );
        console.log("✅ Converted string 'recommendationCount' to number if needed.");
        //   post all queries API
        app.post('/queries', async (req, res) => {
            const newQueries = {
                ...req.body,
                recommendationCount: 0
            };
            const result = await queriesCollection.insertOne(newQueries);
            res.send(result);
        })

        // Get all the queries for the specific user
        app.get('/queries/user/:UserEmail', async (req, res) => {
            const userEmail = req.params.UserEmail;
            const query = {
                UserEmail: userEmail
            }
            const result = await queriesCollection.find(query).sort({ createdAt: -1 }).toArray()
            res.send(result);
        })

        // get all the queries
        app.get('/queries', async (req, res) => {

            const result = await queriesCollection.find().sort({ createdAt: -1 }).toArray()
            res.send(result);
        })

        //   get the queries based on specific id
        app.get('/queries/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await queriesCollection.findOne(query);
            res.send(result)
        })



        // RecommendationCollection
        app.post('/recommendation', async (req, res) => {
            const newRecommendation = req.body;
            const queryId = newRecommendation.queryId;
            const result = await recommendationCollection.insertOne(newRecommendation);

            if (result.insertedId && queryId) {

                // here update field
                await queriesCollection.updateOne(
                    { _id: new ObjectId(queryId) },
                    { $inc: { recommendationCount: 1 } }
                )
            }

            res.send(result);
        })
        // get recommendation Details
        app.get('/recommendation/:queryId',async(req,res)=>{
            const id= req.params.queryId;
            const query ={
                queryId:id
            };
            const result= await recommendationCollection.find(query).sort({date:-1}).toArray();
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Product recommendation server is running');
})
app.listen(port, () => {
    console.log(`Product recommendation server is running at port: ${port}`);
})