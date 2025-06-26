const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb')
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()

//middlewares per la gestione delle richieste in entrata
app.use(express.json())
app.use(bodyParser.json());
app.use(cors())

const config = {
  PORT: 3000,
  TOKEN_SIGN_KEY: '<chiave per firma token>',
  MONGODB_URI: `mongodb+srv://vaniillaval:3vZgkBJYuXo4WTn4@clusterval.qhgmc5m.mongodb.net/?retryWrites=true&w=majority&appName=ClusterVal`,
  MONGODB_DB: 'sample_mflix'
}

// Creazione oggetto di connessione a mongodb
const client = new MongoClient(config.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})

//middleware controllo validità token - eseguito per tutte le richieste ricevute indistintamente dal path
// app.use(function (req, res, next) {

//   if (req.originalUrl === '/login' || req.originalUrl === '/addUser') {  //escludo rotte che non devono essere sotto autenticazione
//     return next()
//   }
//   if (req.headers.authorization && req.headers.authorization.length > 0 && req.headers.authorization.split(' ')[0] === 'Bearer') {
//     const token = req.headers.authorization.split(' ')[1] // lettura token presente nel header "authorization" della richiesta http
//     try {
//       const decoded = jwt.verify(token, config.TOKEN_SIGN_KEY) //verifica e recupero contenuto token ricevuto
//       req.user = decoded //salvataggio contenuto del token in un campo del oggetto json della richiesta http ricevuta in modo da averlo disponibile all'interno del codice che risponde alla richiesta

//       next()//procedo con il richiamo del codice della richiesta effettiva 
//     } 
//     catch (err) {
//       console.error(err)
//       res.status(403).json({ rc: 1, msg: err.toString() }) //risposta in caso di errore nella validazione del token
//     }
//     } 
//     else {
//         res.status(400).json({ rc: 1, msg: 'Manca il token nella richiesta' }) //risposta in caso di assenza del token nella richiesta
//     }
// })

// Effettua il login con le credenziali fornite nel body della richiesta 
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {

    await client.connect()   // connessione a mongodb
    const db = client.db(config.MONGODB_DB) // imposto il db in cui devo effettuare la query

    const user = await db.collection('users').findOne({ username: username }); // cerco se esite già un utente con lo username che ho ricevuto
    if (!user) return res.status(404).json({ rc: 1, msg: `User ${username} non trovato` });// in caso non esiste rispondo alla richiesta indicando che l'utente non esiste

    const match = await bcrypt.compare(password, user.password); // controllo che la password ricevuta nella richiesta corrisponda a quella salvata sul database
    if (!match) return res.status(401).json({ rc: 1, msg: 'Credenziali non valide' })// in caso non corrispondesse rispondo alla richiesta indicando che le credenziali ricevute non sono valide
    const content = { username }
    const token = jwt.sign(content, config.TOKEN_SIGN_KEY, { expiresIn: '1h' }) // genero quindi un token e gli imposto una durata di validità (1 ora in questo caso)
    // in caso di errore nella generazione del token rispondo con un messaggio di errore
    if (!token) return res.status(500).json({ rc: 1, msg: 'Generazione token fallita' })
    res.status(200).json({ rc: 0, msg: 'Login effettuato con successo', token: token });  // invio la risposta alla richiesta con il token
  }
  catch (err) {
    console.error(err)
    res.status(500).json({ rc: 1, msg: err.toString() })
  }
  finally { // sia con che senza errori chiudo la connessione a mongodb
    await client.close()
  }
})

app.get('/ciao', async (req, res) => { //questo funziona :(
  console.log("Ciao!!!!")
  res.status(200).json({ saluti: "Accipicchia!!!!" })
})

// Creazione di un nuovo utente con le credenziali fornite nel body della richiesta
app.put('/addUser', async (req, res) => {
  try {
    const { username, password, mail } = req.body;
    // leggo i parametri (obbligatori) username, password e email ricevuti nel body della richiesta
    await client.connect() // apro la connessione a mongodb
    const user = await db.collection('users').findOne({ username: username });
    const email = await db.collection('mail').findOne({ mail: mail });
    if (user) return res.status(404).json({ rc: 1, msg: `Utente ${username} già presente, riprova` }); // controllo se esiste già un utente con lo stesso username e se esiste rispondo con un messaggio di errore adeguato
    if (email) return res.status(404).json({ rc: 1, msg: `La mail ${mail} è già assegnata ad un altro account, riprova` }); // effettuo lo stesso controllo anche per il campo email
    next()// se supero i controlli precedenti allora posso inserire il nuovo utente nel database
    await db.collection('users').insertOne({ username, password, mail })// inserisco il nuovo utente nella collection users
    res.status(201).send({ rc: 0, msg: `User ${username} aggiunto con successo` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ rc: 1, msg: err.toString() })
  } finally {
    await client.close() //chiudo connessione
  }
})

// Aggiunta di un nuovo film con i dati forniti nel body della richiesta
app.post('/addFilm', async (req, res) => {
  try {
    await client.connect() // apro la connessione a mongodb
    const db = client.db(config.MONGODB_DB) // imposto il database su cui voglio lavorare
    const { title, director, year } = req.body // leggo i parametri (obbligatori) title, director e year ricevuti nel body della richiesta

    // se i parametri non sono tutti correttamente valorizzati rispondo con un messaggio di errore adeguato 
    if (!title) return res.status(404).json({ rc: 1, msg: `Il campo ${title} non è presente` });// in caso non esiste rispondo alla richiesta indicando che l'utente non esiste
    if (!director) return res.status(404).json({ rc: 1, msg: `Il campo ${director} non è presente` });// in caso non esiste rispondo alla richiesta indicando che l'utente non esiste
    if (!year) return res.status(404).json({ rc: 1, msg: `Il campo ${year} non è presente` });// in caso non esiste rispondo alla richiesta indicando che l'utente non esiste


    const existingMovie = await db.collection('movies').findOne({ title: title, year: year });// controllo se esiste già un film con lo stesso titolo e lo stesso anno
    if (existingMovie) return res.status(409).json({ rc: 1, msg: `Film ${title} già presente, riprova` });// se esiste già un film con lo stesso titolo e lo stesso anno rispondo con un messaggio di errore adeguato


    await db.collection('movies').insertOne({ title, director, year }) // inserisco il nuovo film nella collection movies
    res.status(201).send({ rc: 0, msg: `Film ${title} aggiunto con successo` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ rc: 1, msg: err.toString() })
  } finally {
    await client.close()
  }
})

// ritorna una lista filtrata di film  
app.get('/listMovies', async (req, res) => {

  app.use(express.json())
  const filters = req.body // leggo i filtri ricevuti nel body della richiesta in formato json
  if (!filters) return res.status(400).json({ rc: 1, msg: 'Nessun filtro specificato' }) // se non sono stati specificati filtri rispondo con un messaggio di errore adeguato
  try {
    await client.connect() // apro la connessione a mongodb
    const db = client.db(config.MONGODB_DB) // imposto il database su cui voglio lavorare
    const query = {} // creo un oggetto vuoto che conterrà i filtri da applicare alla query
    //db.getCollection("movies").find({runtime:{$gt:90} }) questo trova i film che sono sopra a 90 minuti, questa query funziona... 

    if (filters.title) query.title = { $regex: filters.title, $options: 'i' } // se il filtro title è presente lo aggiungo alla query come filtro di ricerca 
    if (filters.director) query.director = { $regex: filters.director, $options: 'i' } // se il filtro director è presente lo aggiungo alla query come filtro di ricerca
    if (filters.year) query.year = filters.year // se il filtro year è presente lo aggiungo alla query come filtro di ricerca

    for (let index = 0; index < 50; index += 1) {
      const stringa = querydatabase(client, index);
      console.log(stringa)
    }

    //const movies = await db.collection('movies').find(query).sort({ _id: -1 }).limit(50).toArray() // effettuo la query e recupero i primi 50 record che trovo, ordinati in maniera decrescente per campo _id
    // res.status(200).json({ rc: 0, data: movies }) // rispondo alla richiesta ritornando un campo data nel body della risposta che contiene i record recuperati
  } catch (err) {
    console.error(err)
    res.status(500).json({ rc: 1, msg: err.toString() })
  }
  finally {
    await client.close() // chiudo la connessione a mongodb
  }
})

async function querydatabase(client, index) {
  const result = await client.db("sample_mflix").collection("movies").find({ _id: index });

  return result.toArray();
}



// attivazione web server in ascolto sulla porta indicata
app.listen(config.PORT, () => {
  console.log(`MovieManager in ascolto sulla porta: ${config.PORT}`)
})