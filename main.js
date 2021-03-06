const {app, Tray, shell} = require("electron");
const request = require('request');
const numeral = require('numeral');
const spinner = ["⠿","⠷","⠶","⠦","⠤","⠄","⠀"];
const refreshms = 300000;
const threshold = 2.50;

const tickers = {
    btc: {
        q: "CURRENCY:BTCUSD",
        i: "rcg@2x.png",
        iu: "rcgup@2x.png",
        id: "rcgdown@2x.png",
        s: 1,				// <<- Enter number of 'shares' you own here
        p: "000"			// <<- Enter the decimal precision here
    }
};

function createTicker(ticker){
    const tray = new Tray(ticker.i),
        data = {
            price: {f: `$,00.${ticker.p || "00"}`},
            change: {f: `$,0.${ticker.p || "00"}`},
            percent: {f: `0,0.${ticker.p || "00"}%`},
            amount: {f: `$,0.${ticker.p || "00"}`}
        };

    let spinnerIndex = -1,
        showDiff = false,
        showThresholdImage = false,
        display = "price";

    tray.on('right-click', function handleClicked () {
        shell.openExternal("https://www.google.com/finance?q=" + ticker.q);
    });
    tray.on('click', function handleClicked () {
        if (display === "price") { display = "change"; }
        else if (display === "change") { display = "percent"; }
        else if (display === "percent") { ticker.s ? display = "amount" : display = "price" }
        else if (display === "amount") { display = "price"; }

        setDisplayValues();
    });

    function setCurrentPrice() {
        for (let key in data) {
            if(data.hasOwnProperty(key) && !key.startsWith("old")) {
                data["old"+key] = JSON.parse(JSON.stringify(data[key]));
            }
        }

        // Using Google Finance (deprecated, but still seems to be working)
        /*
        request("http://www.google.com/finance/info?infotype=infoquoteall&q=" + ticker.q, function (error, response, body) {
            if (!error && response && response.statusCode === 200) {
                const finance = JSON.parse(body.replace("// [", "").replace("]",""));

                data.price.v = parseFloat(finance.l.replace(/,/,""));
                data.change.v = parseFloat(finance.c);
                data.percent.v = parseFloat(finance.cp) / 100.0;
                data.amount.v = data.price.v * ticker.s;

                showDiff = Math.abs(data.oldprice.v - data.price.v) > 0.01;
                showThresholdImage = Math.abs(data.oldprice.v - data.price.v) > threshold;
                setDisplayValues();
                if(showDiff) {
                    setTimeout(() => { setDisplayValues(); }, 30000);
                }
            } else {
                tray.setTitle(spinner[spinnerIndex] + "Error: " + (response && response.statusCode || "No Response"));
                console.log("Error: " + (response && response.statusCode || "No Response: " + error));
            }
        });
        */

        // Using Yahoo Finance (returns less data than google, but at least it's still working)
        request("https://query1.finance.yahoo.com/v8/finance/chart/" + ticker.q + "?range=1d&interval=5m", function (error, response, body) {
            if (!error && response && response.statusCode === 200) {
                const finance = JSON.parse(body);

                if (finance && finance.chart && finance.chart.result && finance.chart.result[0] &&
                    finance.chart.result[0].indicators && finance.chart.result[0].indicators.quote &&
                    finance.chart.result[0].indicators.quote[0] && finance.chart.result[0].indicators.quote[0].open) {

                    let opens = finance.chart.result[0].indicators.quote[0].open.filter(open => open);
                    let index = Math.max(0, opens.length - 1);
                    data.price.v = parseFloat(opens[index]) / parseFloat(ticker.d || 1.0);
                    data.change.v = 0;
                    data.percent.v = 0;
                    data.amount.v = data.price.v * ticker.s * parseFloat(ticker.d || 1.0);

                    showDiff = Math.abs(data.oldprice.v - data.price.v) > 0.01;
                    updateDisplay();
                    showDiff && setTimeout(() => (showDiff = !showDiff), (refreshms / 10));
                }
            } else {
                tray.setTitle(`${spinner[spinnerIndex]}Error: ${(response && response.statusCode || "No Response")}`);
            }
        });
    }

    function setDisplayValues() {
        const text = numeral(data[display].v).format(data[display].f) +
            (!showDiff ? "" :
                numeral(data[display].v - data["old" + display].v)
                    .format(" +" + data[display].f.replace(/[$%]/,""))
                    .replace(/\+/,"⤴").replace(/-/,"⤵"));

		if (showThresholdImage) {
			const direction = data[display].v - data["old" + display].v > 0 ? "u" : "d";
			tray.setImage(ticker["i"+direction]);
		} else {
			tray.setImage(ticker.i);
		}

        tray.setTitle(spinner[spinnerIndex] + text);
        tray.setToolTip(text);
    }

    function fetchPrice(delay) {
        setTimeout(() => {
            spinnerIndex = (spinnerIndex + 1)%spinner.length;
            if (spinnerIndex === 0) {
                setCurrentPrice();
            } else {
                setDisplayValues();
            }
            fetchPrice(refreshms / spinner.length);
        }, delay);
    }

    fetchPrice(0);
}

app.dock.hide();
app.on("ready", () => {
    for (let key in tickers) {
        if (tickers.hasOwnProperty(key)) {
            createTicker(tickers[key]);
        }
    }
});


