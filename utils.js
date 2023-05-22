export const randomIntFromInterval = (min, max) =>{ // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export const  publicGame = (game) => {
    const fields = game.status !== "running" ? game.fields : {}

    for (const id of game.public) {
        fields[id] = game.fields[id]
    }

    return {
        ...game,
        fields,
        public: undefined
    }
}
