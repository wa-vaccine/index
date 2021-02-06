import React from 'react';
import './App.css';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import axios from 'axios';
// import * as geolib from 'geolib';

import 'bootstrap/dist/css/bootstrap.min.css';

const sitePrefix = "https://wa-vaccine.xvm.mit.edu:3075"

class App extends React.Component {

  constructor() {
    super();
    
    this.state = ({
      readyState: 0,
      useLocation: false,
      shouldUpdateTable: true
    });

    // navigator.geolocation.getCurrentPosition(
    //   (position) => {
    //     this.setState({
    //       useLocation: true,
    //       currentPosition: position.coords
    //     });
    //   },
    //   () => {
    //     this.setState({
    //       useLocation: false
    //     });
    //   }
    // );
  }

  fetchJsonFiles() {
    fetch(sitePrefix + '/api/locations', {headers: {'Access-Control-Allow-Origin': '*'}})
    .then( res => res.json())
    .then(data => {
      var locationDictionary = {};

      var locationsData = data;

      var locsShorthand = locationsData["locations"];
      for(var i = 0; i < locsShorthand.length; i++) {
        var id = locsShorthand[i]["name"] + " " + locsShorthand[i]["url"] + " " + locsShorthand[i]["address"] + " " + locsShorthand[i]["city"] + " " + locsShorthand[i]["county"];
        locationDictionary[id] = locsShorthand[i];
      }
      this.setState({
        locationDictionary: locationDictionary,
        readyState: this.state.readyState + 1
      });
    });
    axios.get(sitePrefix + "/api/statuses", {headers: {'Access-Control-Allow-Origin': '*'}})
    .then((res) => {
      this.setState({
        statusData: res.data,
        readyState: this.state.readyState + 1
      });
    });

    axios.get(sitePrefix + "/api/last_update", {headers: {'Access-Control-Allow-Origin': '*'}})
    .then((res) => {
      this.setState({
        lastWebsiteUpdateTime: new Date(res.data["time"]),
        readyState: this.state.readyState + 1
      });
    });
  }

  updateDataAndState() {
    if(this.state.readyState !== 3) {
      return;
    }

    var now = new Date();

    axios.get(sitePrefix + "/api/last_update", {headers: {'Access-Control-Allow-Origin': '*'}})
      .then((res) => {
        var date = new Date(res.data["time"]);
        // console.log("COMPARE " + (date - this.state.lastWebsiteUpdateTime) + " " + date);
        if(date - this.state.lastWebsiteUpdateTime !== 0) {
          this.setState({
            readyState: 0,
            shouldUpdateTable: true,
            lastWebsiteUpdateTime: date
          });
          this.fetchJsonFiles();
        }
      });

    if(this.state.shouldUpdateTable) {
      var statusVal = [];

      this.setState({
        available: 0
      });
      var statuses = this.state.statusData["statuses"];
      
      // var distances = {};
      // if(statuses.length > 0 && "lat" in this.state.locationDictionary[statuses[0]["loc"]]) {
      //   for(var i = 0; i < statuses.length; i++) {
      //     var locEntry = this.state.locationDictionary[statuses[i]["loc"]];
      //     var metersAway = geolib.getDistance(this.state.currentPostion, {
      //       latitude: parseFloat(locEntry["lat"]),
      //       longitude: parseFloat(locEntry["long"])
      //     });
      //     var milesAway = metersAway / 1609.34;
      //     milesAway = Math.round(milesAway * 10) / 10; 
      //     distances[statuses[i]] = milesAway;
      //   }

      //   statuses.sort((a, b) => {
      //     return distances[a] - distances[b];
      //   });
      // }

      for(var i = 0; i < statuses.length; i++) {
        var data = statuses[i]["serialized"];

        if(data["availability"] === "AVAILABLE") {
          this.setState({
            available: this.state.available + 1
          });

          var locEntry = this.state.locationDictionary[statuses[i]["loc"]];

          // if(this.state.useLocation && "lat" in locEntry && "long" in locEntry) {
          //   var locInfo = distances[statuses[i]] + " miles away";
          //   var locDetails = locInfo + "\n" + locEntry["county"] + "\n" + (locEntry["address"] === "" ? locEntry["city"] : locEntry["address"]) + "\n" + locEntry["phoneNumber"] + "\n" + locEntry["email"];
          // } else {
          var locDetails = locEntry["county"] + "\n" + (locEntry["address"] === "" ? locEntry["city"] : locEntry["address"]) + "\n" + locEntry["phoneNumber"] + "\n" + locEntry["email"];
          // }

          statusVal.push(this.getCard(i + 1, locEntry["name"], locDetails, data["currentUrl"]));
        }
      }

      this.setState({
          lastRescrapeRenderTime: Date.parse(this.state.lastWebsiteUpdateTime),
          status: statusVal,
          shouldUpdateTable: false
      });
    }

    var secondsAgo = Math.floor((now - this.state.lastWebsiteUpdateTime) / 1000);
    var minutesAgo = Math.floor(secondsAgo / 60);
    var hoursAgo = Math.floor(minutesAgo / 60);

    var lastUpdateTimeTextVal;
    if(secondsAgo < 60) {
      lastUpdateTimeTextVal = "Last updated " + secondsAgo + " second" + (secondsAgo === 1 ? "" : "s") + " ago"
    } else if(minutesAgo < 60) {
      lastUpdateTimeTextVal = "Last updated " + minutesAgo + " minute" + (minutesAgo === 1 ? "" : "s") + " ago"
    } else {
      lastUpdateTimeTextVal = "Last updated " + hoursAgo + " hour" + (hoursAgo === 1 ? "" : "s") + " ago"  
    }

    var apptTextVal;
    if(this.state.available === 0) {
      apptTextVal = "There are currently no locations that are accepting appointments."
    } else if (this.state.available === 1) {
      apptTextVal = "There is currently 1 location that is accepting appointments:";
    } else {
      apptTextVal = "There are currently " + this.state.available + " locations that are accepting appointments:";
    }

    this.setState({
      lastUpdateTimeText: lastUpdateTimeTextVal,
      apptText: apptTextVal
    });
  }

  componentDidMount() {
    this.fetchJsonFiles();

    this.timerID = setInterval(
      () => {
        this.updateDataAndState();
      }, 1000
    );
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <br></br>
          <h1 style={{fontSize: "1.8em"}}>
            Where can I get the vaccine?
          </h1>
          <h3 style={{fontSize: "0.7em"}}>
            WASHINGTON STATE
            <br></br>
            Currently available for ages 65 years and older.
          </h3>
          <br></br>
          <p style={{fontSize: "1em"}}>
            {this.state.readyState !== 3 ? "Loading..." : this.state.apptText}
          </p>
        </header>
        <body>
          {this.state.status}
        </body>
        <p style={{fontSize: "1em", color: "#cccccc"}}>
            {this.state.lastUpdateTimeText}
          </p>
      </div>
    );
  }

  getCard(index, name, details, url) {
    return (
      <Card style={{ width: '95%', marginLeft: "2.5%", marginRight: "2.5%", marginBottom: "0.8rem" }}>
            <Card.Body>
              <Card.Title style={{fontWeight: "bold"}}>{index}. {name}</Card.Title>
              <Card.Text style={{marginLeft: "1.5rem", lineHeight: "1rem"}}>
                {details.split("\n").map((item, i) => <p key={i}>{item}</p>)}
              </Card.Text>
              <Button style={{ width: '100%' }} variant="primary" target="_blank" href={url}>Visit site</Button>
            </Card.Body>
          </Card>
    );
  }
}

export default App;
