FROM continuumio/miniconda3:4.10.3
ARG SOLC=0.8.0

SHELL ["/bin/bash", "-c"]

# CI SPECIFIC - Install curl and NodeJS 14
# NodeJS is used only in CI to push our docs to Stoplight(see Jenkinsfile)
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y curl software-properties-common locales

RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

RUN apt-get install wget gdebi -y
RUN wget https://github.com/souffle-lang/souffle/releases/download/1.6.2/souffle_1.6.2-1_amd64.deb -O /tmp/souffle.deb && gdebi --n /tmp/souffle.deb
RUN apt-get update && apt-get -y install graphviz
RUN curl -L https://github.com/ethereum/solidity/releases/download/v$SOLC/solc-static-linux > /usr/bin/solc-$SOLC && \
    chmod +x /usr/bin/solc-$SOLC && \
    ln -s /usr/bin/solc-$SOLC /usr/local/bin/solc
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

RUN git clone https://github.com/eth-sri/securify2.git
RUN cd securify2 && \
    source /opt/conda/etc/profile.d/conda.sh && \
    conda activate solidity-contracts && \
    python setup.py install && \
    pip install -r requirements.txt && \
    pip install requests

RUN cd /securify2/securify/staticanalysis/libfunctors/ && ./compile_functors.sh
RUN cd /securify2/securify/staticanalysis/souffle_analysis && \
        souffle --dl-program=../dl-program \
        --fact-dir=/securify2/securify/staticanalysis/facts_in \
        --output-dir=/securify2/securify/staticanalysis/facts_out \
        -L../libfunctors -w analysis.dl

ENV LD_LIBRARY_PATH /securify2/securify/staticanalysis/libfunctors
RUN chmod -R o+w /securify2

# Create new user to not run in sudo mode
RUN useradd --create-home appuser
WORKDIR /home/appuser
USER appuser
