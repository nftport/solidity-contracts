FROM continuumio/miniconda3:4.10.3

SHELL ["/bin/bash", "-c"]

# CI SPECIFIC - Install curl and NodeJS 14
# NodeJS is used only in CI to push our docs to Stoplight(see Jenkinsfile)
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs
RUN mkdir .npm
RUN chown -R 1006:root .npm
RUN mkdir -p /.cache && chown -R 1006:root /.cache
RUN mkdir -p /.config && chown -R 1006:root /.config
RUN mkdir -p /.local && chown -R 1006:root /.local
RUN mkdir -p /.solcx && chown -R 1006:root /.solcx

RUN apt-get update && apt-get install -y gcc

# This is for the stupid Jenkins to be able to create conda env
RUN chown -R 1006:root /opt/conda

ADD environment.yml /
RUN conda env create -f environment.yml

# Create new user to not run in sudo mode
RUN useradd --create-home appuser
WORKDIR /home/appuser
USER appuser
