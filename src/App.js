import './App.css';
import {useState, useEffect} from 'react';
import { Layout, Flex, theme, Menu, message, Spin, Table, Typography} from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { TableauPulse, PulseLayout } from '@tableau/embedding-api';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function App() {

  //  Define the Antd theme to use
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  //  Alerting/messaging framework
  const [messageApi, contextHolder] = message.useMessage();


  //  Define state hooks
  const [metrics, setMetrics] = useState([])
  const [jwt, setJwt] = useState();
  const [selectedMetric, setSelectedMetric] = useState();
  const [tableData, setTableData] = useState([])
  const [tableColumns, setTableColumns] = useState([])
  const [isLoading, setIsLoading] = useState(false);

  //  Run this code once, when the app is first loaded
  useEffect(() => {
    //  Fetch data, using an asynchronous call
    const run = async () => {
      const status = await dataFetcher();
    }
    run();
  },[])

  //  Fetch data to get the app setup
  const dataFetcher = async () => {

    //  Get the list of metrics to embed
    const tabMetricsResp = await fetch('/api/tableauSettings');
    const tabMetrics = await tabMetricsResp.json();

    //  Get a JWT for SSO into Tableau
    const tabJwtResp = await fetch('/api/tableauJwt');
    const tabJwt = await tabJwtResp.json();

    //  Update the state
    setMetrics(tabMetrics.metrics);
    setJwt(tabJwt.jwt);
  }

  //  Render the pulse metrics, after fetching their metadata
  useEffect(() => {

    //  Loop through metrics array
    for (let metric of metrics) {

      //  Get a reference to the div container for this metric
      const divContainer = document.getElementById(metric.key);
      if (divContainer) {

        //  Make sure there are no old pulse artifacts
        const overlayElement = document.querySelector('.tableauPulseOverlay');
        [...divContainer.children].forEach( child => {
          if (child.className !== 'tableauPulseOverlay') {
            divContainer.removeChild(child);
          }
        })

        //  Create the viz
        let pulse = new TableauPulse();

        //  Provide the URL to the pulse metric
        pulse.src = metric.src;

        //  Formatting options
        pulse.layout = PulseLayout.Ban;
        pulse.width = '325px';
        pulse.height = '200px';

        //  Add the JWT for SSO
        pulse.token = jwt;

        //  Append the viz into the div
        divContainer.appendChild(pulse);
      }
    }
  },[metrics,jwt])

  //  Event Handler: Clicking on a pulse metric
  const metricClicked = async (metric) => {
    
    //  Show the loading spinner
    setIsLoading(true)

    //  Fetch the metric's underlying data
    const metricDataResp = await fetch(`/api/getMetricData?metricId=${metric.id}`)
    const metricData = await metricDataResp.json();

    //  Make sure we got data successfully
    if (metricData.error) {
      
      //  Notify the end user
      messageApi.open({
        type: 'error',
        content: metricData.error,
      });
    } else {

      //  Create the columns array, based on the column metadata returned by VDS
      const firstRow = metricData.data[0];
      const cols = Object.keys(firstRow).map( col => {
        return { 
          title: col,
          dataIndex: col,
          key: col
        }
      })
      /*
      const cols = metricData.data.map( col => {
        return {
          title: col.caption ? col.caption : col.columnName,
          dataIndex: col.columnName,
          key: col.columnName,
        }
      })
        */

      //  Create the data table, based on the column metadata returned by VDS
      const data = metricData.data.map( (row,index) => {
        return {...row, key:index};
      })

      //  Update the state
      setTableData(data);
      setTableColumns(cols);
      setSelectedMetric({...metric, metricName: metricData.metric.name, datasourceName: metricData.metric.datasource});
      setIsLoading(false);
    }
  }

  //  Should we display the table? only
  const hideTable = (selectedMetric === undefined);
  const table = hideTable ? <></> : <div>
                                      <Title level={3}>{`Metric: ${selectedMetric.metricName}`}</Title>
                                      <Title level={4}>{`Datasource: ${selectedMetric.datasourceName}`}</Title>
                                      <Table dataSource={tableData} columns={tableColumns} />;
                                    </div>

  //  Render the simple app
  return (
    <div className="App">
      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <div className="demo-logo" />
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={[1]}
            items={[{
              key: 1,
              label: `DataFam 2024`,
            }]}
            style={{ flex: 1, minWidth: 0 }}
          />
        </Header>
      </Layout>
     
     <div className="metricsContainer">
      <Flex justify='space-around' align='center' wrap>
        {
          metrics.map( (metric) => {
            return <div id={metric.key} className='tableauPulseMetric' key={metric.key} >
              <div className='tableauPulseOverlay' onClick={() => {metricClicked(metric)}}></div>
            </div>
          })
        }
      </Flex>
     </div>
     <div className="tableContainer">
      <Spin indicator={<LoadingOutlined spin />} size="large" spinning={isLoading} fullscreen/>
      { table }
     </div>
    </div>
  );
}

export default App;
