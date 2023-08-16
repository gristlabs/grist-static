default:
	@echo "To make and view a static page with Grist in it:"
	@echo "  git submodule update --init"
	@echo "  make requirements"
	@echo "  make build"
	@echo "  make serve"
	@echo "  # now visit http://localhost:3030/page/"

requirements:
	cd ext && yarn install --frozen-lockfile --modules-folder=../node_modules --verbose
	cd core && yarn install --frozen-lockfile --verbose
	cd core && test -e ext && echo ext present || ln -s ../ext ext
	cd core && yarn run install:python
	cd core/sandbox/pyodide && make setup
	cd core/sandbox && ./bundle_as_wheel.sh && cp dist/*.whl pyodide/_build/packages/

update-lock:
	cd ext && yarn install --modules-folder=../node_modules --verbose
	cd core && yarn install

build:
	cd core && yarn run build:prod

# This will keep the code built as you edit it; the server it runs is
# useless, just ignore it.
start:
	cd core && GRIST_SESSION_SECRET=something yarn start

link:
	./scripts/link_page_resources.sh

copy:
	./scripts/link_page_resources.sh copy

package:
	./scripts/build_dist.sh

run-demo:
	make package
	rm -rf _dist
	cp -Lr dist _dist 2>/dev/null || true
	docker build -t grist-static-demo .
	docker run -it -p 3000:3000 grist-static-demo


serve:
	@echo "========================================="
	@echo "See http://localhost:3030/page"
	@echo "========================================="
	./scripts/link_page_resources.sh
	python3 -m http.server 3030
