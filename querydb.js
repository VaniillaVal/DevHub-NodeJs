const { MongoClient, ServerApiVersion } = require('mongodb')
async function main() {
    /**
     * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
     * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
     */
    const uri = "mongodb+srv://vaniillaval:3vZgkBJYuXo4WTn4@clusterval.qhgmc5m.mongodb.net/?retryWrites=true&w=majority&appName=ClusterVal";

    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        // Make the appropriate DB calls
        await listDatabases(client);
        const variabile = await querydatabase(client);
         console.log(variabile)
        
    } catch (e) {
        console.log("aiuto")
        console.error(e);
    } finally {
        await client.close();
    }
}

async function querydatabase(client) {
    const result = await client.db("sample_mflix").collection("movies").find({ title: "The Italian" });
     console.log("pippo")
    

   return result.toArray();
}



async function listDatabases(client) {
    databasesList = await client.db().admin().listDatabases();

    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};


main().catch(console.error);