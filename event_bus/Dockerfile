FROM nats:2.10-alpine

COPY config/nats-server.conf /etc/nats/nats-server.conf

EXPOSE 4222 8222

CMD ["nats-server", "--config", "/etc/nats/nats-server.conf"]
