// HTTP API call KPIs to Influx DB

/*
 * Send HTTP API call KPIs to Influx DB & Grafana
 * ==========================================================
 * 
 * Description:
 * -----------
 * Send identity-aware API call KPIs to Influx DB and visualize in Grafana.
 * KPIs: Latency, bandwidth, status code
 * Identity data: namespace, source and destination service labels and IPs
 * Available charts: 
 * - Latency, bandwidth and status codes over time
 * - Aggregated latency and bandwidth per: 1m, 1h, 24h
 * 
 * Environment Variables:
 * ----------------------
 * INFLUXDB_URL:    <influxdb-url>
 * INFLUXDB_TOKEN:  <influxdb-token>
 * INFLUXDB_ORG:    <influxdb-org>
 * 
 * How to use:
 * -----------
 * - Include this file in the scripts folder
 * - Make sure the environment variables are present in the config file
 * - Build a Grafana dashboard based on the JSON model
 * 
 * Assets:
 * -------
 * ./influx_db_kpis_grafana.json - Grafana's dashboard JSON model
*/

// Use environment variables (recommended) or change these variables locally
var infUrl      = env.INFLUXDB_URL;
var infToken    = env.INFLUXDB_TOKEN;
var infOrg      = env.INFLUXDB_ORG;
var infBucket   = env.INFLUXDB_BUCKET ?  env.INFLUXDB_BUCKET : "Kubeshark";
var infMeasurement = env.INFLUXDB_MEASUREMENT ? env.INFLUXDB_MEASUREMENT: "callKPIs";
var ACTIVE     = false;  // change to false to disable this script

if (!infUrl || !infToken || !infOrg ){
    console.error("One or more of the mandatory InfluxDB variables is missing. No point in continuing. Exiting script.");
    ACTIVE = false;
}

function onItemCaptured(data) {
    return hookSendMetrics(data);
}

function hookSendMetrics ( data ) {
    if (!ACTIVE) return;
    try{
        if (data.protocol.name !== "http") return;
        
        var metrics = { 
            latency:    data.elapsedTime, 
            status:     data.response.status,
            bandwidth:  data.requestSize + data.responseSize
        };
        var tags = { 
            dst_name:   data.dst.name ? data.dst.name : "unresolved", 
            dst_ip:     data.dst.ip, 
            dst_port:   data.dst.port,
            dst_ns:     data.dst.namespace ? data.dst.namespace : "unresolved",
            src_name:   data.src.name ? data.src.name : "unresolved", 
            src_ip:     data.src.ip,
            src_ns:     data.src.namespace ? data.src.namespace : "unresolved",
            path:       data.request.path,
            node:       data.node.name
        };

        // send KPI metrics on every API call
        vendor.influxdb(
            infUrl,
            infToken,
            infOrg,     
            infBucket,  
            infMeasurement , 
            metrics,
            tags
                    
        ); 
//        console.log("Wrote:", JSON.stringify({"metrics":  metrics, "tags": tags, "data": data }));
    }
    catch (err){
        console.error("hookSendMetrics",err);
    }
}