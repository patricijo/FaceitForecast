const bearer = "Bearer  yourToken"; //hiden for github you need your own token

let sr;
const data = [];

/// OBSERVE THE URL
var focusTrapObserver = new MutationObserver(function (mutations) {
  mutations.forEach(function (m) {
    if (
      document
        .querySelector("meta[property=og\\:url]")
        .content.includes("/csgo/room/")
    ) {
      getData();
    }
  });
});

focusTrapObserver.observe($("meta[property=og\\:url]")[0], {
  attributes: true,
});

/// GET MATCH ID
const getMatchID = () => {
  let path = document
    .querySelector("meta[property=og\\:url]")
    .content.split("/");
  return path[6];
};

/// GET MATCH DATA
const getData = async () => {
  let matchID = getMatchID();

  if (!data.find((data) => data["matchID"] === matchID)) {
    playerCounter = 0;
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="fetchingData"><div class="lds-ring"><div></div><div></div><div></div><div></div></div><div class="fetchingH1">Fetching Data</div><div class="fetchingText">0/10 Players</div></div>'
    );
    const updateFetchText = () => {
      playerCounter++;
      document.body.querySelector(".fetchingText").innerHTML =
        playerCounter + "/10 Players";
    };

    data.push({ matchID: matchID, rating: [] });

    matchRatings = data.find((data) => data["matchID"] === matchID).rating;

    const url = "https://open.faceit.com/data/v4/matches/" + matchID;

    const ajdata = await $.ajax({
      type: "GET",
      url: url,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", bearer);
      },
    });

    for (var i = 0; i < ajdata.teams.faction1.roster.length; i++) {
      var player = ajdata.teams.faction1.roster[i];
      await playerStats(player.player_id, "team1", matchRatings);
      updateFetchText();
    }
    for (var i = 0; i < ajdata.teams.faction2.roster.length; i++) {
      var player = ajdata.teams.faction2.roster[i];
      await playerStats(player.player_id, "team2", matchRatings);
      updateFetchText();
    }

    const average = (array) =>
      array.reduce((a, b) => a + b) / array.length || 0;
    function percentage(partialValue, totalValue) {
      return (100 * partialValue) / totalValue;
    }

    for (var i = 0; i < matchRatings.length; i++) {
      if (matchRatings[i].rating.length > 2) {
        matchRatings[i].avg = average(matchRatings[i].rating);
      }
    }
    for (var i = 0; i < matchRatings.length; i++) {
      if (matchRatings[i].team == "team1" && matchRatings[i].avg != null) {
        team2 = matchRatings.find(
          (r) =>
            r["map"] === matchRatings[i].map &&
            r["team"] === "team2" &&
            r["avg"] != null
        );
        if (team2) {
          matchRatings[i].winChance = percentage(
            matchRatings[i].avg,
            matchRatings[i].avg + team2.avg
          );
        }
      }
    }

    document.body.querySelector(".fetchingData").remove();
  }

  getShadowDom();
};

/// GET PLAYER STATS
const playerStats = async (playerID, team, matchRatings) => {
  const playerData = {
    totalMatches: null,
    totalRate: null,
    maps: {},
  };
  const url =
    "https://open.faceit.com/data/v4/players/" + playerID + "/stats/csgo";

  const ajd = await $.ajax({
    type: "GET", //GET, POST, PUT
    url: url, //the url to call

    beforeSend: function (xhr) {
      //Set token here
      xhr.setRequestHeader("Authorization", bearer);
    },
  });

  console.log("playerstats", ajd);
  playerData.totalMatches = ajd.lifetime["Wins"];
  playerData.totalRate = ajd.lifetime["Win Rate %"];
  for (var i = 0; i < ajd.segments.length; i++) {
    var player_stats_map = ajd.segments[i];

    if (
      player_stats_map.mode == "5v5" &&
      player_stats_map.stats["Matches"] > 5
    ) {
      const realWinRate =
        50 + (player_stats_map.stats["Win Rate %"] - playerData.totalRate) * 2;
      const playRate =
        1 + player_stats_map.stats["Matches"] / playerData.totalMatches / 5;
      const avgFrags =
        (player_stats_map.stats["Average Kills"] *
          player_stats_map.stats["Average K/D Ratio"] *
          player_stats_map.stats["Average K/R Ratio"]) /
        10;

      let smurfBonus = 1;
      if (
        player_stats_map.stats["Matches"] < 350 &&
        player_stats_map.stats["Average K/D Ratio"] > 1.2 &&
        player_stats_map.stats["Average Kills"] > 22
      ) {
        smurfBonus = 1.2;
      }
      const finalRating = Math.floor(realWinRate * playRate * smurfBonus);
      const ratingData = {
        team: team,
        map: player_stats_map.label.replace("de_", ""),
        rating: [finalRating],
        avg: null,
        winChance: null,
      };
      if (
        matchRatings.some(
          (e) =>
            e.team === team &&
            e.map === player_stats_map.label.replace("de_", "")
        )
      ) {
        objIndex = matchRatings.findIndex(
          (obj) =>
            obj.team === team &&
            obj.map === player_stats_map.label.replace("de_", "")
        );
        matchRatings[objIndex].rating.push(finalRating);
      } else {
        matchRatings.push(ratingData);
      }
    }
  }
};

/// GET SHADOWROOT
const getShadowDom = () => {
  sr = document.querySelector("#parasite-container").shadowRoot;

  if (sr && sr.querySelector("#__next")) {
    getElements();
    observeSD();
  } else {
    setTimeout(getShadowDom(), 100);
  }
};

/// OBSERVE SHADOWROOT
const observeSD = () => {
  var focusTrapObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.target.childNodes[0].classList.contains("grUAEy")) {
        elements =
          mutation.target.childNodes[0].getElementsByClassName("btPmxQ");
        for (var i = 0; i < elements.length; i++) {
          mapname = elements[i]
            .querySelector(".sc-eHOjnG")
            .innerHTML.toLowerCase();

          appendHTML(elements[i], mapname);
        }
      }

      //
    });
  });

  focusTrapObserver.observe(sr, {
    childList: true,
    subtree: true,
  });
};

/// FIND ELEMENTS
const getElements = () => {
  var elements = sr.querySelector("#__next").getElementsByClassName("btPmxQ");

  for (var i = 0; i < elements.length; i++) {
    mapname = elements[i].querySelector(".sc-eHOjnG").innerHTML.toLowerCase();

    appendHTML(elements[i], mapname);
  }
};

/// APPEND HTML
const appendHTML = (element, mapname) => {
  let matchID = getMatchID();

  var matchData = data.find((r) => r["matchID"] === matchID);

  if (!element.classList.contains("forcasted")) {
    element.classList.add("forcasted");

    element.style.display = "block";

    var pull = "left";

    var winChance = matchData.rating.find(
      (r) =>
        r["map"] === mapname && r["team"] === "team1" && r["winChance"] != null
    );

    if (winChance) {
      winChance = winChance.winChance;

      if (winChance <= 50) {
        winChance = 100 - winChance;
        pull = "right";
      }

      element.insertAdjacentHTML(
        "beforeend",
        '<div style="width:100%;height: 5px;background-color: #333;"><div class="winbar" style=" background-color: #fff;height: 5px;width: ' +
          winChance +
          "%;float: " +
          pull +
          ';"></div></div>'
      );
    }
  }
};

if (
  document
    .querySelector("meta[property=og\\:url]")
    .content.includes("/csgo/room/")
) {
  getData();
}
