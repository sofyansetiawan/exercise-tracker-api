const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require("body-parser")
const router = express.Router();
require('dotenv').config()

let mongoose;
let mongodb;
try {
  mongoose = require("mongoose");
  mongodb = require("mongodb");
} catch (e) {
  console.log(e);
}

app.use(cors())
app.use(express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());
app.use('/', router);

const { Schema } = mongoose
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
mongoose.set('useFindAndModify', false);

const userSchema = new Schema({
  username: { type: String, required: true }
})
const User = mongoose.model("User", userSchema);

const exerciseSchema = new Schema({
  id_user: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now, required: true },
  duration: { type: Number, required: true },
})
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

router.get("/is-mongoose-ok", function (req, res) {
  if (mongoose) {
    res.json({ isMongooseOk: !!mongoose.connection.readyState });
  } else {
    res.json({ isMongooseOk: false });
  }
});

app.get("/api/users", (req, res) => {
  User.find({}, (err, data) => {
    if (err) return res.send(err)
    const allUser = data.map(user => {
      return { username: user.username, _id: user._id}
    })
    res.json(allUser)
  })
})

app.post("/api/users", (req, res) => {
  const username = req.body.username
  console.log(username)
  if(!username) return res.send("Path `username` is required.")
  User.findOne({username: username}, (err, data) => {
    if (err) return res.send(err)
    if(!data){
      User.create({username: username}, (err, data) => {
        if (err) return res.send(err)
        res.json({
          username: data.username,
          _id: data._id
        })
      })
    }
    else{
      res.send(`Username already taken`)
    }
  })
})

app.post("/api/users/:_id/exercises", (req, res) => {
  const uid = req.params._id || ''
  const description = req.body.description || ''
  const duration = req.body.duration || ''
  const date = req.body.date || Date.now()

  if(!description) return res.send("Path `description` is required.")
  if(!duration) return res.send("Path `duration` is required.")

  User.findById(uid, (err, data1) => {
    if (err) {
      return res.send(err)
    }
    else{
      if(data1){
        Exercise.create({
          id_user: data1._id,
          description,
          date,
          duration
        }, (err, data2) => {
          if (err) return res.send(err)
          let dateformat = data2.date.toDateString()
          res.json({
            _id: data2.id_user,
            username: data1.username,
            date: dateformat,
            duration: data2.duration,
            description: data2.description
          })
        })
      }
      else{
        res.send("not found")
      }
    }
  })
})

app.get("/api/users/:_id/logs", (req, res) => {
  const from = req.query.from || ''
  const limit = Number(req.query.limit) || 0
  const idUser = req.params._id || ''

  if(idUser){
    User.findById(idUser, (err, data1) => {
      if (err) return res.send(err)
      let dataFind = {id_user: data1._id}
      if(from) dataFind.date = { $gte: from }
      Exercise.find(dataFind, (err, data2) => {
        if (err) return res.send(err)
        console.log(data2)
        const logs = data2.map(item => {
          return {description: item.description, duration: item.duration, date: item.date.toDateString()}
        })
        let objResult = {
          _id: data1._id,
          username: data1.username,
          count: data2.length,
          log: logs
        }
        res.json(objResult)
      }).limit(limit)
    })
  }
  else{
    res.send("not found")
  }

})

// Error handler
app.use(function (err, req, res, next) {
  if (err) {
    res
      .status(err.status || 500)
      .type("txt")
      .send(err.message || "SERVER ERROR");
  }
});

// Unmatched routes handler
app.use(function (req, res) {
  if (req.method.toLowerCase() === "options") {
    res.end();
  } else {
    res.status(404).type("txt").send("Not Found");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
