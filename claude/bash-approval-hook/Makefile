BINARY := bash-approval-hook
DEBUG_BINARY := $(BINARY)-debug
DEBUG_LDFLAGS := -X main.debugLogEnabled=true

.PHONY: build debug-build clean test vet lint check

build: $(BINARY)
debug-build: $(DEBUG_BINARY)

$(BINARY): $(wildcard *.go) go.mod go.sum
	go build -o $@ .

$(DEBUG_BINARY): $(wildcard *.go) go.mod go.sum
	go build -ldflags "$(DEBUG_LDFLAGS)" -o $@ .

clean:
	rm -f $(BINARY) $(DEBUG_BINARY)

test:
	go test ./...

vet:
	go vet ./...

lint:
	golangci-lint run ./...

check: vet lint test
