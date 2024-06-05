This nodejs script builds an auth token from the Chinese API DESSMONITOR.com portal uses it to generate API requests based on your Inverter details (serial number, device id) with a Salt encryption to then return all the inverter details for that day and write them to InfluxDB which will then be graphed in Grafana.

> ℹ️ Suggestions / Comments / Recomendations Welcome on how to do it better this is my v0.1 Beta & First GitHub post


# Why?
- I Can't seem to interface with the [Esener 5.5Kwh Inverters](https://web.archive.org/web/20240605134455/https://solarwarehousesa.com/products/esener-5-5kw-mppt-100a-120v-450vdc-wifi) via RS232/USB 🤯 (And I have tried Solar assistant, Windows multiple USB->RS232 and even the Voltronic USB to RS232 - I just cannot get anything to read. I had a previous AXPERT and could read via an ESP32 on the RS232, but not these.

![TheUniverseTimAndEricMindBlownGIF](https://github.com/theLarryds/solar/assets/171812054/1796bb35-8ecb-4ed8-806f-abfef9549a2f)

- I have multiple inverters running in Parrelel and the DessMonitor/SmartESS app only allows you to view data per inverter at a time, I need to combine the data to view a single "virtual" inverter view to view metrics such as total solar generated or total power consumption.
- Additionally the connection on app is flakey and times out using the same API as the web portal I can historically to view consumption locally.


# Current Acheivements in this update:
- Get all Solar data per inverter into Influx and Graph it (I am no Dev but Copilot and the Internet made it possible)
![image](https://github.com/theLarryds/solar/assets/171812054/f58b6d63-cf05-438c-bbbf-7ad96f461885)


# Challenges
- API time on all Inverters return at different minutes so reporting is best kept at 10 min intervals, not ideal but alas can't read directly and the WIFI Plug Pro's only send every ~5 minutes the value 😒
