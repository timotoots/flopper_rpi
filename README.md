# Linki Raspberry Pi
Prototype for Raspberry Pi software for Linki Players

For self-documentation

* Install OMX Web interface

https://github.com/brainfoolong/omxwebgui-v2  
/opt/omxwebgui/

```
(crontab -l 2>/dev/null; echo "@reboot php -S 0.0.0.0:4321 -t /opt/omxwebgui/ > /dev/null 2>&1 &") | crontab -
```

* Run on boot

add to rc.local

```
su - pi -c "/usr/bin/screen -dmS test bash -c '/opt/linki_rpi/start.sh; exec bash'" &
```
