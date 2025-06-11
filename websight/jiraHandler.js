// createSubtask.js using the jira.js library
const {Version3Client} = require('jira.js');

const JIRA_DOMAIN = 'coveord.atlassian.net';
const JIRA_EMAIL = 'majdaini@coveo.com';
const JIRA_API_TOKEN = "ATATT3xFfGF0H_Oq5MdxupSBYeoJKBxgPy-PcEbSAEABijyzmRv81U9FfoSin64fqQ0qSaiAwFgKpmI1aPcFgs6CrXepY7PCgi7XAYwSNPzJp1VaTV39JVGX6HxxQWCYQA9SVFoyxO2HNXuozGX5rXgO9L1BOOybkIWZGn_axdvR7ayPmzaFEKs=F5B52702";
const PARENT_ISSUE_KEY = 'CTR24-242';
const SUBTASK_SUMMARY = 'QPM service request';

const client = new Version3Client({
  host: `https://${JIRA_DOMAIN}`,
  authentication: {
    basic: {
      email: JIRA_EMAIL,
      apiToken: JIRA_API_TOKEN,
    },
  },
});

async function findAssigneeID(email) {

  const users = await client.userSearch.findUsers({
    query: email,
  });

  if (!users.length) {
    throw new Error(`No user found for email: ${email}`);
  }

  const user = users[0];
  return user.accountId;
}

async function createJiraSubtaskWithLibrary(assigneeId, body) {

  const domains = body.domains;
  try {
    return await client.issues.createIssue({
      fields: {
        project: {
          key: PARENT_ISSUE_KEY.split('-')[0],
        },
        reporter: {
          accountId: assigneeId,
        },
        parent: {
          key: PARENT_ISSUE_KEY,
        },
        summary: SUBTASK_SUMMARY,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Requesting average QPM from SimilarWeb Using this configuration',
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Use Case :',
                  marks: [{type: 'strong'}],
                },
                {
                  type: 'text',
                  text: body.useCase ? body.useCase : ""
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Case Deflection :',
                  marks: [{type: 'strong'}],
                },
                {
                  type: 'text',
                  text: String(body.caseDeflection ?? ''),
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Country :',
                  marks: [{type: 'strong'}],
                },
                {
                  type: 'text',
                  text: body.country ? body.country : ""
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Domains :',
                  marks: [{type: 'strong'}],
                },
              ],
            },
            {
              type: 'bulletList',
              content: domains.map(domain => ({
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: domain.url,
                      },
                    ],
                  },
                ],
              })),
            }, {
              type: 'rule',
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Results :',
                  marks: [
                    {
                      type: 'strong',
                    },
                  ],
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Estimated QPM: ',
                  marks: [{type: 'strong'}],
                },
                {
                  type: 'text',
                  text: new Intl.NumberFormat().format(body.responseData?.estimatedQPM || 0)

                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Average Visits: ',
                  marks: [{type: 'strong'}],
                },
                {
                  type: 'text',
                  text: new Intl.NumberFormat().format(body.responseData.averageVisits),
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Average Bounce Rates: ',
                  marks: [{type: 'strong'}],
                },
                {
                  type: 'text',
                  text: new Intl.NumberFormat().format(body.responseData.averageBounceRates) + '%',
                },
              ],
            }
          ],
        },
        issuetype: {
          name: 'Task',
        },
      },
    });
  } catch (error) {
    console.error('Error creating sub-task or updating reporter. Details below:');
    console.error(error.response?.data || error.message || error);
  }
}


async function editJiraTaskStatus(newIssue, assigneeId, taskStatus) {

  const availableTransitions = await client.issues.getTransitions({
    issueIdOrKey: newIssue.key,
  });
  const targetTransition = availableTransitions.transitions.find(
    (t) => t.name === taskStatus
  );

  if (!targetTransition) {
    const availableNames = availableTransitions.transitions.map(t => t.name).join(', ');
    throw new Error(`Transition to "${taskStatus}" not available. Available transitions are: ${availableNames}`);
  }


  await client.issues.doTransition({
    issueIdOrKey: newIssue.key,
    transition: {
      id: targetTransition.id,
    },
  });


}

async function updateJiraDescriptionWithResponse(issue, responseData) {


  if (!issue || !issue.key) {
    console.error("Error: Invalid 'issue' object provided. It must contain a 'key'.");
    return;
  }
  try {
    const latestIssue = await client.issues.getIssue({issueIdOrKey: issue.key});

    const currentDescription = latestIssue.fields.description || {
      type: 'doc',
      version: 1,
      content: [],
    };

    const contentToAppend = [
      {
        type: 'rule',
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Results :',
            marks: [
              {
                type: 'strong',
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Estimated QPM: ',
            marks: [{type: 'strong'}],
          },
          {
            type: 'text',
            text: new Intl.NumberFormat().format(responseData?.estimatedQPM || 0)

          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Average Visits: ',
            marks: [{type: 'strong'}],
          },
          {
            type: 'text',
            text: new Intl.NumberFormat().format(responseData.averageVisits),
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Average Bounce Rates: ',
            marks: [{type: 'strong'}],
          },
          {
            type: 'text',
            text: new Intl.NumberFormat().format(responseData.averageBounceRates) + '%',
          },
        ],
      }

    ];

    const updatedDescription = {
      ...currentDescription,
      content: [
        ...currentDescription.content,
        ...contentToAppend,
      ],
    };

    await client.issues.editIssue({
      issueIdOrKey: issue.key,
      fields: {
        description: updatedDescription,
      },
    });

  } catch (error) {
    console.error(`Error updating description for issue ${issue.key}. Details below:`);
    const errorMessage = error.response?.data?.errorMessages ||
      error.response?.data?.errors ||
      error.response?.data ||
      error.message ||
      error;
    console.error(JSON.stringify(errorMessage, null, 2));
  }
}


module.exports = {createJiraSubtaskWithLibrary, findAssigneeID, editJiraTaskStatus, updateJiraDescriptionWithResponse};