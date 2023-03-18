default:
	@echo "To make and view a static page with Grist in it:"
	@echo "  git submodule update --init"
	@echo "  make requirements"
	@echo "  make build"
	@echo "  ./scripts/link_page_resources.sh"
	@echo "  python -m http.server 3030"
	@echo "  # now visit http://localhost:3030/page/"

requirements:
	cd ext && yarn install --frozen-lockfile --modules-folder=../node_modules --verbose
	cd core && yarn install --frozen-lockfile --verbose
	cd core && test -e ext && echo ext present || ln -s ../ext ext
	cd core && yarn run install:python
	cd core/sandbox/pyodide && make setup
	cd core/sandbox && ./make.sh && cp dist/*.whl pyodide/_build/packages/

update-lock:
	cd ext && yarn install --modules-folder=../node_modules --verbose
	cd core && yarn install

build:
	cd core && yarn run build:prod

start:
	cd core && GRIST_SESSION_SECRET=something GRIST_SANDBOX_FLAVOR=pyodideInline yarn start

serve:
	@echo "========================================="
	@echo "See http://localhost:3030/page/index.html"
	@echo "========================================="
	./scripts/link_page_resources.sh
	python -m http.server 3030
