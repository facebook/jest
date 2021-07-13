#Build: docker build -t jest .
#Run: docker run --volume="$PWD:/usr/src/app" --rm jest:latest

#Use Node 12.13.0 image
#Includes Python2.7
FROM node:12

#Setup basic environment
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LC_ALL=C.UTF-8 \
    LANGUAGE=en_US.UTF-8

WORKDIR /usr/src/app

#Copy entire directory
COPY . ./

#Install dependencies
RUN yarn

#Build && Watch for changes
ENTRYPOINT ["yarn"]
CMD ["watch"]
