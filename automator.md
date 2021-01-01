## Automator Script

```
do shell script "
source ~/.bash_profile 
source /usr/local/opt/nvm/nvm.sh
cd ~/BTCTrayTicker/
nohup npm start > /dev/null 2>&1 &
"
```
