BINARY := bash-approval-hook

.PHONY: build clean test vet lint check

build: $(BINARY)

$(BINARY): $(wildcard *.go) go.mod go.sum
	go build -o $@ .

clean:
	rm -f $(BINARY)

test:
	go test ./...

vet:
	go vet ./...

lint:
	golangci-lint run ./...

check: vet lint test
