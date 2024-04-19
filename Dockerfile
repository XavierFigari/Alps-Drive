FROM node:alpine
COPY src /app/
WORKDIR /app/
RUN <<EOF
./create_tmp.sh 2>~/err.txt
npm install
EOF
CMD npm run dev