

const searchForm = document.getElementById("top-search");
const searchBar = document.getElementById("search-bar");
const searchResults = document.getElementById("search-results");
const lyrics = document.getElementById("lyrics");
const pageLinks = document.querySelectorAll(".pageLink,.pageLink-active");
const searchPages = document.getElementById("search-pages");

// CODE STUFF
C_ID = "960e28854592469eb3cdcb3da5fae639"
let codeVerifier = generateRandomString(128);
let redirectUri = "https://jacobhataway.github.io/343-p3/" //"https://w3stu.cs.jmu.edu/hatawajs/343s23/p3-bs-starter-main/"
console.log("HI")
const urlParams = new URLSearchParams(window.location.search);
let code = urlParams.get('code');
let token = localStorage.getItem('access_token')
console.log(token, code);
//console.log(code);


searchForm.onsubmit = (ev) => {
  console.log("submitted top-search with", ev);
  ev.preventDefault();
  if (!token) {
    if (!code) {
      getAuthCode(C_ID, redirectUri)
    } else {
      getToken(C_ID, redirectUri, code);
    }
  }
  console.log(searchForm.value);
  searchSpotify(token, searchBar.value, 0).then(e => displayTracks(e));
};

function displayTracks(results) {
  if (results.error) {
    localStorage.removeItem("access_token")
    getAuthCode(C_ID, redirectUri)
  }
  console.log("Got results:", results);
  searchResults.innerHTML="";
  results.tracks.items.forEach(e => {
    let li = document.createElement("li");
    li.className = "result";
    li.innerHTML = `<img src="${e.album.images[2].url}" class="2thumb">${e.name}`;
    li.onclick = function () { selectTrack(e.name, e.artists[0].name) };
    searchResults.appendChild(li);
  });
}

function searchPage(n) {
  searchSpotify(token, searchBar.value, (n-1)*5).then(e => displayTracks(e));
  [...pageLinks].forEach(e => {
    console.log(e.innerText, "" + n);
    if (e.innerText == "" + n) {
      e.className="pageLink-active";
    } else {
      e.className="pageLink";
    }
  })
}

function selectTrack(song, artist) {
  console.log("Selected", song);
  lyrics.innerText="loading...";
  fetch(`https://corsproxy.io/?https://lyrist.vercel.app/api/${song}/${artist}`).then(e => e.json()).then(data => showLyrics(data.lyrics));
}

function showLyrics(l) {
  if (l) {
    lyrics.innerText=l;
  } else {
    lyrics.innerText="Lyrics Not Found";
  }
}

// function to search for spotify results
function searchSpotify(accessToken, query, offset) {
  return fetch(`https://api.spotify.com/v1/search?q=${query}&type=album%2Cplaylist%2Cartist%2Ctrack&limit=5&offset=${offset}`, {
    headers: {
      Authorization: 'Bearer ' + accessToken
    }
  }).then(r => r.json()).then(data => {
    console.log(data)
    return data;
  })
}





////////////////////////////////// AUTHENTIFICATION /////////////////////////////////////////////////////

// send user to spotify to permit/deny our app access, success will result
// in an authorization code
function getAuthCode(clientId, redirectUri) {
  return generateCodeChallenge(codeVerifier)
    .then(codeChallenge => {
      localStorage.setItem('code_verifier', codeVerifier);

      let state = generateRandomString(16);

      // NOTE: depending on which spotify API endpoints you wish to access,
      // you may require different "scopes". The scopes are the way Spotify
      // informs the user about what things your app would like permission
      // to do on their behalf in Spotify. 
      // see the list of scopes in the docs: 
      // https://developer.spotify.com/documentation/web-api/concepts/scopes#list-of-scopes
      let scope = 'user-read-private user-read-email user-modify-playback-state';


      let args = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: scope,
        redirect_uri: redirectUri,
        state: state,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge
      });

      window.location = 'https://accounts.spotify.com/authorize?' + args;
    });
}

// get the access token that we need to make requests to the spotify api endpoints
function getToken(clientId, redirectUri, code) {
  if (!(clientId && redirectUri && code)) {
    console.error('requires', clientId, redirectUri, code)
  }
  let codeVerifier = localStorage.getItem('code_verifier');

  let body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier
  });

  return fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('HTTP status ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      localStorage.setItem('access_token', data.access_token);
      return data.access_token;
    })
    .catch(error => {
      console.error('Error:', error);
    });
}


////////// functions to use the Spotify API
// function to use the profile endpoint
function getProfile(accessToken) {
  return fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: 'Bearer ' + accessToken
    }
  }).then(r => r.json()).then(data => {
    console.log(data)
    return data;
  })
}

function appendAPIOutput(newVal) {
  apiOutputElem.value = '\n\n' + new Date().toLocaleTimeString() + '\n' + JSON.stringify(newVal) + apiOutputElem.value
}

// a bunch of functions from the spotify example that we'll need
// code verifier 
function generateRandomString(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Code Challenge
function generateCodeChallenge(codeVerifier) {
  function base64encode(string) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = window.crypto.subtle.digest('SHA-256', data);

  return digest.then(d => base64encode(d));
}
