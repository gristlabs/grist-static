default:
	@echo "To make and run Grist:"
	@echo "  make requirements"
	@echo "  make build"
	@echo "  GRIST_SESSION_SECRET=something make start"

requirements:
	cd ext && yarn install --frozen-lockfile --modules-folder=../node_modules --verbose
	cd core && yarn install --frozen-lockfile --verbose
	cd core && test -e ext && echo ext present || ln -s ../ext ext
	cd core && yarn run install:python

update-lock:
	cd ext && yarn install --modules-folder=../node_modules --verbose

build:
	cd core && yarn run build:prod

start:
	cd core && yarn start
