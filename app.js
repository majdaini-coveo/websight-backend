const express = require("express");
const cors = require("cors");
const calculateQPM = require("./websight/websightCalculator");
const app = express();
app.use(cors());
app.use(express.json());
const {
  createJiraSubtaskWithLibrary,
  findAssigneeID,
  editJiraTaskStatus,
} = require("./websight/jiraHandler");
const googleOathverification = require("./websight/googleOathVerify");

const port = 3000;


app.post("/similarWeb", async function (req, res) {

  try {
    await googleOathverification(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    const responseData = await calculateQPM(req.body);
    res.json(responseData);
  } catch (err) {
    res.status(400).json({
      message: "An error occurred while processing your request.",
      error: err.message
    });
  }
});

app.post("/jiracreator", async function (req, res) {

  try {
    await googleOathverification(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    const requesterEmail = req.headers['x-user-email']
    const assigneeID = await findAssigneeID(requesterEmail)
    const newIssue = await createJiraSubtaskWithLibrary(assigneeID, req.body)
    await editJiraTaskStatus(newIssue, assigneeID, "Done")
    res.status(200).end();
  } catch (e) {
    res.status(400).json({
      message: "An error occurred while creating jiraTicketCreator.",
      error: err.message
    })
  }

})


app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
});



