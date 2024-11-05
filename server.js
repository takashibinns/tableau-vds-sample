const express = require("express");
const app = express();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config()

//  Load tableau details from environment variables
const tabConfig = {
  domain: process.env.TABLEAUDOMAIN,
  baseUrl: `https://${process.env.TABLEAUDOMAIN}`,
  site: process.env.TABLEAUSITE,
  metricIds: (process.env.METRICIDS || '').split(','),
  user: process.env.TABLEAUUSERNAME,
  connectedApp: {
    id: process.env.CONNECTEDAPPID,
    secretId: process.env.CONNECTEDAPPSECRETID,
    secretValue: process.env.CONNECTEDAPPSECRETVALUE
  },
  apiVersion: '3.21',
  vdsBaseUrl: 'https://developer.salesforce.com/tools/tableau/headless-bi/v1'
}

//  Define the default options object for urlFetch
const fetchOptions = {
  'headers': {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
}

//  Function to generate a JWT for authenticating to Tableau CLoud
const createJwt = (email, connectedAppClientId, secretId, secretValue) => {
    
    //  The Audience attribute is a constant
    const aud = 'tableau';
  
    const scopes = [
      'tableau:insights:embed',                      //  Embed pulse metrics
      'tableau:insight_metrics:read',                //  Pulse Metrics
      'tableau:insight_definitions_metrics:read',
      'tableau:content:read',
      'tableau:viz_data_service:read'                //  VizQL Data Service
    ]
  
    //  Define the algorithm to use
    const algorithm = 'HS256';
  
    //  Define the expiration
    let now = new Date()
    let expirationDate = (now.getTime() / 1000) + (5 * 60)         //    5 minutes from now
    let notBeforeDate = (now.getTime() / 1000) - (5 * 60)         //    5 minutes before
  
    //  Define the JWT payload
    let payload = {
        'iss': connectedAppClientId,                               //    Connected App's ID
        
        'exp': expirationDate,                                     //    How long this JWT should be valid for
        'jti': uuidv4(),                                           //    Unique identifier for this JWT
        'aud': aud,                                                //    constant value
        'sub': email,                                              //    User to authenticate as
        'scp': scopes                                              //    Scopes
    }
  
    //  Sign the JWT
    let options = {
      'header': {
          'kid': secretId,
          'iss': connectedAppClientId,
          'alg': algorithm,
          'typ': 'JWT'
      },
      'algorithm': algorithm
    }
    const token = jwt.sign(payload, secretValue, options);
    
    //  Return the signed JWT
    return token
}

//  Function to get a Tableau REST API Token
const tableauAuthenticate = async () => {

  //  Create a JWT for access the Tableau API
  const jwt = createJwt(tabConfig.user, tabConfig.connectedApp.id, tabConfig.connectedApp.secretId, tabConfig.connectedApp.secretValue)

  //  Define the body of the API call
  const payload = {
    "credentials": {
      "jwt": jwt,
      "site": {
        "contentUrl": tabConfig.site
      }
    }
  }

  //  Define the URL to make the call to
  const url = `${tabConfig.baseUrl}/api/${tabConfig.apiVersion}/auth/signin`;

  //  Define the HTTP request options
  let options = structuredClone(fetchOptions);
  options.method = 'post';
  options.body = JSON.stringify(payload);

  //  Make the API call, and parse the results
  const resp = await fetch(url, options)  
  const data = await resp.json()

  return {
    apiToken: data.credentials.token,
    jwt: jwt,
    siteId: data.credentials.site.id
  };

}

//  Function to get a Tableau Pulse metric's datasource and definition
const tableauMetric = async (metricId, siteId, apiToken) => {

  //  Make an API call to fetch the metric, based on it's ID
  //  https://help.tableau.com/current/api/rest_api/en-us/REST/TAG/index.html#tag/Pulse-Methods/operation/MetricQueryService_GetMetric
  const url1 = `${tabConfig.baseUrl}/api/-/pulse/metrics/${metricId}`;

  //  Define the HTTP request options
  let options = structuredClone(fetchOptions);
  options.headers['X-Tableau-Auth'] = apiToken;
  options.method = 'get';

  //  Make the API call, and parse the results
  const resp1 = await fetch(url1, options)  
  const data1 = await resp1.json()
  const definitionId = data1.metric.definition_id;

  //  Make an API call to fetch the definition, based on the metric's defition_id
  //  https://help.tableau.com/current/api/rest_api/en-us/REST/TAG/index.html#tag/Pulse-Methods/operation/MetricQueryService_GetDefinition
  const url2 = `${tabConfig.baseUrl}/api/-/pulse/definitions/${definitionId}`;

  //  Make the API call, and parse the results
  const resp2 = await fetch(url2, options)  
  const data2 = await resp2.json();
  const dataSourceId = data2.definition.specification.datasource.id;

  //  Make an API call to fetch the data source metadata, based on the definition's datasource_id
  //  https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_data_sources.htm#query_data_source
  const url3 = `${tabConfig.baseUrl}/api/${tabConfig.apiVersion}/sites/${siteId}/datasources/${dataSourceId}`;

  //  Make the API call, and parse the results
  const resp3 = await fetch(url3, options)  
  const data3 = await resp3.json()

  return {
    metric: data1.metric,
    definition: data2.definition,
    dataSource: data3.datasource
  }
}

//  HTTP Request for a Tableau JWT (for embedding)
app.get("/tableauJwt", function (request, response) {
  
  //  Get a JWT to use for embedding, using the environment variables
  const jwt = createJwt(tabConfig.user, tabConfig.connectedApp.id, tabConfig.connectedApp.secretId, tabConfig.connectedApp.secretValue);

  //  Respond with the credentials
  response.send({jwt: jwt}); 
  
});

//  HTTP Request for a list of Tableau metric IDs
app.get("/tableauSettings", function (request, response) {
  
  //  Generate an object with everything needed to for embedding pulse metrics
  const payload = {
    metrics: tabConfig.metricIds.map((metricId) => {
      return {
        id: metricId,
        src: `${tabConfig.baseUrl}/pulse/site/${tabConfig.site}/metrics/${metricId}`,
        key: `tableau-metric-${metricId}`
      }
    })
  };
 
  //  Return the response object
  response.send(payload);
});

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
  

  //  Step 5: TODO - Map columns from the query to the datasource fields
  

  //  Step 5: TODO - Execute the VDS query
  
 
  //  Return the data table
  //  The `data` and `columns` arrays need to populate the Ant Design <Table columns={columns} dataSource={data} />
  //  More details on the specific data structure can be found here: https://ant.design/components/table
  response.send({
    metric: {
      name: definition.metadata.name,
      datasource: dataSource.name
    },
    data:[],
    columns: []
  });
});

/*
//  Check tomake sure both front end and back end are running
app.use("/", function(req, res) {
  request("http://localhost:8000" + req.path)
    .on("error", err => {
      console.log("Error - middleware");
      console.log(err);
      const restartScript =
        "<script>setTimeout(() => location.href = '/', 300)</script>";
      return res.send(
        "client not started yet, try refreshing in a few seconds" +
          restartScript
      );
    })
    .pipe(res);
});
*/

//  Listen on port 8000
//const port = process.env.PORT;
const port = 8000;
const listener = app.listen(port, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
