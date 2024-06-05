const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const previousResponse = require("./auth/auth.json");
const influxAuth = require("./auth/auth_influx.json");
const invertersData = require("./auth/inverters.json");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");

//DESS API PRE stuff
const salt = new Date().getTime().toString();
const secret = previousResponse.dat.secret;
const tokenS = previousResponse.dat.token;
const baseUrl = "http://api.dessmonitor.com/public/";
const action = "queryDeviceDataOneDay";
const date = new Date().toISOString().slice(0, 10);

//INFLUXDB stuff
const token = influxAuth.token;
const url = "http://192.168.41.1:8086";
const client = new InfluxDB({ url, token });
const org = influxAuth.org;
const bucket = influxAuth.bucket;
const writeClient = client.getWriteApi(org, bucket, "s");

//NodeJS telemetry
const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");
const { MeterProvider } = require("@opentelemetry/sdk-metrics");

// You can choose the port and whether to start a web server
const exporter = new PrometheusExporter({ startServer: true, port: 9464 });

const meterProvider = new MeterProvider({
  // Use the readers option to add the Prometheus exporter
  readers: [exporter],
});
const meter = meterProvider.getMeter("prometheus");
// Define custom metrics
const requestCount = meter.createCounter("requests_total", {
  description: "Total number of requests",
});
const errorCount = meter.createCounter("errors_total", {
  description: "Total number of errors",
});
const latency = meter.createHistogram("latency_seconds", {
  description: "Response latency in seconds",
});

console.log("starting");

requestCount.add(1);
const start = Date.now();

invertersData.forEach((item) => {
  const { sn, devcode, pn } = item;
  requestCount.add(1);
  // Construct other parameters
  const otherParams = `&i18n=en_US&pn=${pn}&devcode=${devcode}&devaddr=1&sn=${sn}&date=${date}&source=1&_app_client_=android&_app_id_=com.demo.test&_app_version_=3.6.2.1`;

  // Calculate the signature
  const signature = crypto
    .createHash("sha1")
    .update(salt + secret + tokenS + "&action=" + action + otherParams)
    .digest("hex");

  // Construct the final URL
  const apiUrl = `${baseUrl}?sign=${signature}&salt=${salt}&token=${tokenS}&action=${action}${otherParams}`;

  // Make the API request
  axios
    .get(apiUrl)
    .then(async (response) => {
      requestCount.add(1);
      const inputJson = response.data;
      const headers = inputJson.dat.title.map((item) => item.title);
      const transformedData = inputJson.dat.row.map((row) => {
        const rowData = {};
        row.field.forEach((value, index) => {
          rowData[headers[index]] = value;
        });
        return rowData;
      });

      // Write data to InfluxDB
      transformedData.forEach((rowData) => {
        let point = new Point("inverter")
          .tag("sn", rowData["devise serial number"])
          .floatField("Grid Voltage", rowData["Grid Voltage"])
          .floatField("Grid Frequency", rowData["Grid Frequency"])
          .floatField("Grid Power", rowData["Grid Power"])
          .floatField("AC charging power", rowData["AC charging power"])
          .floatField("Output Voltage", rowData["Output Voltage"])
          .floatField("Output Current", rowData["Output Current"])
          .floatField("Output frequency", rowData["Output frequency"])
          .floatField("Output Active Power", rowData["Output Active Power"])
          .floatField("Output Apparent Power", rowData["Output Apparent Power"])
          .floatField("Battery Voltage", rowData["Battery Voltage"])
          .floatField("Battery Current", rowData["Battery Current"])
          .floatField("Battery Power", rowData["Battery Power"])
          .floatField("PV Voltage", rowData["PV Voltage"])
          .floatField("PV Current", rowData["PV Current"])
          .floatField("PV Power", rowData["PV Power"])
          .floatField("PV Charge Power", rowData["PV Charge Power"])
          .floatField("Load Percent", rowData["Load Percent"])
          .floatField("DC Module Temp", rowData["DC Module Termperature"])
          .floatField("INV Module Temp", rowData["INV Module Termperature"])
          .floatField("AC charging current", rowData["AC charging current"])
          .floatField("PV charging current", rowData["PV charging current"])
          .stringField("Output priority", rowData["Output priority"])
          .floatField(
            "Output Voltage Setting",
            rowData["Output Voltage Setting"]
          )
          .stringField(
            "Charger Source Priority",
            rowData["Charger Source Priority"]
          )
          .timestamp(Math.floor(new Date(rowData.Timestamp).getTime() / 1000));
        writeClient.writePoint(point);
      });
      const finish = Date.now();
      const time = (finish - start) / 1000;
      latency.record(time);
      console.log("finished");
    })
    .catch((error) => {
      console.error("Error calling API:", error.message);
      errorCount.bind(labels).add(1);
    });
});
