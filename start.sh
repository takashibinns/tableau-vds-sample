#!/bin/bash

echo "start server"
npm run server &
echo 'start client -'
PORT=8000 npm run client &
wait