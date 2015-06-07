#! /bin/sh
### BEGIN INIT INFO
# Provides:             authorization.io
# Required-Start:       $all
# Required-Stop:        $remote_fs $syslog
# Default-Start:        2 3 4 5
# Default-Stop:         1 6
# Short-Description:    authorization.io website
### END INIT INFO

set -e

test -x /usr/bin/nodejs || exit 0
. /lib/lsb/init-functions

PIDFILE=/var/run/authorization.io.pid

start() {
  log_daemon_msg "Starting bedrock:" "authorization.io" || true
  if start-stop-daemon --start --quiet -d /home/authorizationio/authorization.io --oknodo --background --make-pidfile --pidfile $PIDFILE --exec /usr/bin/nodejs -- /home/authorizationio/authorization.io/authorization.io.js ; then
    log_end_msg 0 || true
  else
    log_end_msg 1 || true
  fi
}

stop() {
  log_daemon_msg "Stopping bedrock:" "authorization.io" || true
  if start-stop-daemon --stop --quiet --oknodo --pidfile $PIDFILE --retry TERM/3; then
    log_end_msg 0 || true
  else
    log_end_msg 1 || true
  fi
}

case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    start
    ;;
  status)
    status_of_proc -p $PIDFILE /usr/bin/nodejs && exit 0 || exit $?
    ;;
  *)
    log_action_msg "Usage: /etc/init.d/authorization.io {start|stop|restart|status}" || true
    exit 1
esac

exit 0
