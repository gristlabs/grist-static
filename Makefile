default:
	@echo "To make and run Grist:"
	@echo "  make requirements"
	@echo "  make build"
	@echo "  make start"

requirements:
	cd ext && yarn install --frozen-lockfile --modules-folder=../node_modules --verbose
	cd core && yarn install --frozen-lockfile --verbose
	cd core && test -e ext && echo ext present || ln -s ../ext ext
	cd core && yarn run install:python
	cd core/sandbox/pyodide && make setup

update-lock:
	cd ext && yarn install --modules-folder=../node_modules --verbose
	cd core && yarn install

build:
	cd core && yarn run build:prod

start:
	cd core && GRIST_SESSION_SECRET=something GRIST_SANDBOX_FLAVOR=pyodideInline yarn start
