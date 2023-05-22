import express from "express"
import {publicGame, randomIntFromInterval} from "./utils.js";
import {uuid} from "uuidv4";
import cors from "cors";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import * as YAML from "yaml";
import * as fs from "fs";

const app = express()
const port = process.env.port || 8080


const games = {}

const defaultSize = 15

const ENUM = {
    "bomb": "bomb",
    "number": "number"
}

const ENUM_STATUS = {
    "running": "running",
    "fail": "fail",
    "finish": "finish"
}

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())

const file  = fs.readFileSync('./swagger.yaml', 'utf8')
const swaggerDocument = YAML.parse(file)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post("/game", (req, res) => {
    const id = uuid()

    const size = req.body.size || defaultSize

    games[id] = {
        id,
        status: ENUM_STATUS.running,
        size,
        fields: {},
        public: [],
        flags: []
    }

    let bombs = req.body.bombs || 25

    if(bombs >= size*size) return res.status(400).send("You are bomberman! common it is just too much bombs!")
    if(bombs <= 0) return res.status(400).send("Ehmm. It is just not enought bombs!")

    while (bombs > 0) {
        const x = randomIntFromInterval(0, size-1)
        const y= randomIntFromInterval(0, size-1)

        const key = `${x};${y}`

        if(!games[id].fields[key]) {
            games[id].fields[key] = {type: ENUM.bomb}
            bombs--;
        }
    }

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if(games[id].fields[`${x};${y}`]?.type === ENUM.bomb) continue

            let num = 0;

            if(games[id].fields[`${x-1};${y-1}`]?.type === ENUM.bomb) num++
            if(games[id].fields[`${x-1};${y}`]?.type === ENUM.bomb) num++
            if(games[id].fields[`${x-1};${y+1}`]?.type === ENUM.bomb) num++

            if(games[id].fields[`${x};${y-1}`]?.type === ENUM.bomb) num++
            if(games[id].fields[`${x};${y+1}`]?.type === ENUM.bomb) num++

            if(games[id].fields[`${x+1};${y-1}`]?.type === ENUM.bomb) num++
            if(games[id].fields[`${x+1};${y}`]?.type === ENUM.bomb) num++
            if(games[id].fields[`${x+1};${y+1}`]?.type === ENUM.bomb) num++



            games[id].fields[`${x};${y}`] = {
                type: ENUM.number,
                value: num
            }
        }
    }

    res.status(201).send(publicGame(games[id]))
})

app.get("/game/:id", (req, res) => {
    if(!games[req.params.id]) return res.status(404).send("Game doesn´t exist!")

    res.send(publicGame(games[req.params.id]))
})

app.put("/game/:id/play", (req, res) => {
    if(!games[req.params.id]) return res.status(404).send("Game doesn´t exist!")
    if(games[req.params.id].status !== ENUM_STATUS.running) return res.status(404).send("Game is finished already")

    if(req.body.x > games[req.params.id].size-1 || req.body.x < 0) return res.status(400).send("Invalid X range!")
    if(req.body.y > games[req.params.id].size-1 || req.body.y < 0) return res.status(400).send("Invalid Y range!")

    const key = `${req.body.x};${req.body.y}`

    if(games[req.params.id].public.includes(key)) return res.status(400).send("Field already visible!")

    if(games[req.params.id].fields[key]?.type === ENUM.bomb) {
        games[req.params.id].status = ENUM_STATUS.fail
        res.send(publicGame(games[req.params.id]))
    }

    const openField = (x, y) => {
        if(x < 0 || y < 0) return;
        if(x > games[req.params.id].size-1 || y > games[req.params.id].size-1 ) return;

        if(games[req.params.id].public.includes(`${x};${y}`)) return
        games[req.params.id].public.push(`${x};${y}`)

        if(games[req.params.id].fields[`${x};${y}`]?.value === 0) {
            openField(x, y+1)
            openField(x, y-1)
            openField(x-1, y)
            openField(x+1, y)
        }
    }

    openField(req.body.x, req.body.y)

    const openFields = games[req.params.id].public.length + games[req.params.id].flags.length

    if(openFields >= games[req.params.id].size*games[req.params.id].size) {
        games[req.params.id].status = ENUM_STATUS.finish
    }

    res.send(publicGame(games[req.params.id]))
})

app.put("/game/:id/flag", (req, res) => {
    if(!games[req.params.id]) return res.status(404).send("Game doesn´t exist!")
    if(games[req.params.id].status !== ENUM_STATUS.running) return res.status(404).send("Game is finished already")

    if(req.body.x > games[req.params.id].size-1 || req.body.x < 0) return res.status(400).send("Invalid X range!")
    if(req.body.y > games[req.params.id].size-1 || req.body.y < 0) return res.status(400).send("Invalid Y range!")

    const key = `${req.body.x};${req.body.y}`

    if(games[req.params.id].public.includes(key)) return res.status(400).send("Field already visible!")

    if(games[req.params.id].flags.includes(key)) {
        games[req.params.id].flags = [...games[req.params.id].flags].filter(i => i !== key)
    } else {
        games[req.params.id].flags.push(key)
    }

    const openFields = games[req.params.id].public.length + games[req.params.id].flags.length

    if(openFields >= games[req.params.id].size*games[req.params.id].size) {
        games[req.params.id].status = ENUM_STATUS.finish
    }

    res.send(publicGame(games[req.params.id]))
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
