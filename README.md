# DataFam Europe 2024
![Sample app](/screenshots/sample-app.png)

This project is for the Hands of Training session at Tableau DataFam 2024.  The goal is to learn how to structure queries for Tableau's VizQL Data Service API.  This API can be used to programmatically get data from Tableau and send it somewhere else (google sheet, excel, etc) or to provide a richer experience for customers who embed Tableau content into web apps (let users generate data queries on the fly).  By the end of this session, you should be more comfortable building queries for VizQL Data Service.

## VizQL Data Service API
![VizQL API Diagram](https://www.tableau.com/sites/default/files/2024-08/VizQL_hero.png)
[VizQL Data Service API](https://www.tableau.com/blog/vizql-data-service-use-your-data-your-way) is a new REST API that allows you to execute data queries on [published Tableau data sources](https://help.tableau.com/current/pro/desktop/en-us/publish_datasources_about.htm).  In a Tableau workbook, you generate queries by dragging dimensions and measure to the Rows, Columns, and Details cards.  Tableau takes this information and generates a VizQL query behind the scenes.  This API allows you to execute the same type of queries, but without being inside a workbook.  More details are provided in the API documentation, which can be found [here](https://help.tableau.com/current/api/vizql-data-service/en-us/).

## Getting Started

You can run this project in a number of ways, but we'll cover the 2 easiest.

### CodeSandbox.io
If you don't have a code editor and want to get started right away, you can use Code Sandbox.

#### Step a.1: Fork the Github project
Login to Github and fork the **HandsOnTraining** branch of this repository.  This essentially creates a copy of the repository just for you.

#### Step a.2: Get a CodeSandbox.io account
[CodeSandbox.io](https://codesandbox.io/) is a website that provides an entire IDE in your web browser.  Create a free account (you can even use your github account), and [import a github repository](https://codesandbox.io/docs/learn/repositories/getting-started/repo-import).  You'll likely be prompted to allow access to Github, but after that you should be able to search for the repository you forked in step 1.  After selecting the repository, it will take a few minutes for CodeSandbox to get setup.  

#### Step a.3: Create the .env file
![Create new file](/screenshots/codesandbox-1.png)

In order for this web app to connect to the Tableau site, you'll need to provide some environment variables.  In CodeSandbox, create a new file named ```.env``` and populate it using this format:
```
CONNECTEDAPPID=<Tableau-connected-app-client-id>
CONNECTEDAPPSECRETID=<Tableau-connected-app-secret-id>
CONNECTEDAPPSECRETVALUE=<Tableau-connected-app-secret-value>
TABLEAUUSERNAME=<your-email>
METRICIDS=d4c2e057-f8d8-4176-9a34-539ca0ce6a5d,97fe14f2-fa25-4b08-b998-27e2f2f85ad5,98345425-7257-4488-bbc2-4d5710b733d1
TABLEAUDOMAIN=dub01.online.tableau.com
TABLEAUSITE=datafamvdshot
```

Save the file, and that should trigger the app to restart.  Of course, if you want to use this with your own Tableau Cloud site, just populate the TABLEAUDOMAIN, TABLEAUSITE, and METRICIDS from your own site.  Here, we're using some pulse metrics that have already been created on the Hands on Training Tableau Cloud site.

#### Step a.4: Start coding!
![Get to the website](/screenshots/codesandbox-2.png)
At this point, you should have a running web app.  Click on the **Ports** tab and look for the process running on port ```3000```.  There is a button that looks like a globe on that row, if you click that it will open a new browser tab and take you to the running web app.  You should see the web app open up and embed 3 pulse metrics.  Clicking on a metric will try to load the data table, but it will be empty.  

Now you can get started writing the code to convert the definition of the Pulse metric into a VDS query.

### Running Locally
If you want to run this code locally on your workstation, that should be fine too.  The steps are slightly different, and we'll assume you are using VS Code.

#### Step b.1: Clone the github repo
![Clone the repo](/screenshots/vscode-1.png)

Get the link to the **HandsOnTraining** branch of this repository from Github, and copy it.  In VS Code, select **Clone Git Repository** and paste in the URL.  This should clone the repository somewhere on your local workstation

#### Step b.2: Install dependencies
Open a terminal in this directory, and run the below command to install dependencies:
```
npm install
```

#### Step b.3: Create .env file
Similar to the CodeSandbox.io example, we need to provide environment variables so that this web app knows how to talk to Tableau.  Create a new file at the project root called **.env**, and populate it using the .env sample from step **a.3**.

#### Step b.4: Start the app
Now we should have everything needed to get started, all that's left is to start the app
```
npm run start
```
This should open a new browser window with the web app running.  You should see 3 pulse metrics embedded, but clicking on them will result in an empty table.

#### Step b.5 Start coding!
Now you can get started writing the code to convert the definition of the Pulse metric into a VDS query.

## Hands on Training Instructions
All the work required to complete this hands on training session happens within the ```server.js``` file.  You're of course free to make whatever front-end changes you like, but the focus of this session is to get you more comfortable with how VizQL Data Service works.  Server.js is the express service that handles all REST API calls from the client.  


```GET /tableauSettings```: Returns the details needed to embed multiple pulse metrics from a Tableau Cloud site.  This part is already complete.

```GET /tableauJwt```: Returns a valid JWT that can be used with the Embedding API to provide an SSO experience for the embedded Pulse metrics.  This part is already done.

```GET /getMetricData```: This takes in a metric ID, and fetches some metadata about the metric from Tableau Cloud.  The goal is to return a table of data that made up this metric, along with some metadata on what columns are included in that data table.  It gets used by the front-end code to render an [Ant table](https://ant.design/components/table).  This is partially built out, you need to figure out how to use the VizQL Data Service APIs to query for the dimensions and measure defined in the Pulse metric.

```
//  HTTP Request for a Tableau metric's data
app.get("/getMetricData", async function (request, response) {

  //  Determine which metric to fetch data for
  const metricId = request.query.metricId;

  //  Step 1: Get a tableau API token
  const {apiToken, jwt, siteId} = await tableauAuthenticate();

  //  Step 2: Get the metric metadata
  const {metric, definition, dataSource} = await tableauMetric(metricId, siteId, apiToken);

  //  Step 3: TODO - Query for metadata of the data source
  
  //  Step 4: TODO - Create a VDS Query  

  //  Step 5: TODO - Execute the VDS query
  
 
  //  Return the data table
  //  The `data` and `columns` arrays need to populate the Ant Design <Table columns={columns} dataSource={data} />
  //  More details on the specific data structure can be found here: https://ant.design/components/table
  response.send({
    metric: {
      name: definition.metadata.name,
      datasource: dataSource.name
    },
    data:[{}],
    columns: [{}]
  });
});
```

If you get stuck and need help, the working code is provided in the **main** branch of the github repo.