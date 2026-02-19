BINARY := bash-approval-hook

.PHONY: build clean

build: $(BINARY)

$(BINARY): $(wildcard *.go) go.mod go.sum
	go build -o $@ .

clean:
	rm -f $(BINARY)
