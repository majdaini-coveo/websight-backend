const express = require("express");
const cors = require("cors");
const calculateQPM = require("./routes/websightCalculator");
const app = express();
app.use(cors());
app.use(express.json());

const port = 3000;


app.post("/similarWeb", async function (req, res) {
  try {
    const responseData = await calculateQPM(req.body);
    res.status(200).json(responseData);
  } catch (err) {
    res.status(400).json({
      message: "An error occurred while processing your request.",
      error: err.message
    });
  }
});


app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
});



