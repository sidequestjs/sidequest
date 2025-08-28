## [1.6.2](https://github.com/sidequestjs/sidequest/compare/v1.6.1...v1.6.2) (2025-08-28)


### Bug Fixes

* fixed chart animation ([#92](https://github.com/sidequestjs/sidequest/issues/92)) ([81a29b2](https://github.com/sidequestjs/sidequest/commit/81a29b20d0ce45c4e5e1fa79c5f72a8478b9d538))

## [1.6.1](https://github.com/sidequestjs/sidequest/compare/v1.6.0...v1.6.1) (2025-08-27)


### Bug Fixes

* constructor args ([#90](https://github.com/sidequestjs/sidequest/issues/90)) ([28eae93](https://github.com/sidequestjs/sidequest/commit/28eae936205c67fe5b79fed3e9848cc7e8e53317))

# [1.6.0](https://github.com/sidequestjs/sidequest/compare/v1.5.2...v1.6.0) (2025-08-21)


### Features

* add rerun button for canceled, failed, or completed jobs in jobs table ([#83](https://github.com/sidequestjs/sidequest/issues/83)) ([d1a89a0](https://github.com/sidequestjs/sidequest/commit/d1a89a01be4f176065f7c5a654e81f4db03a5db9))

## [1.5.2](https://github.com/sidequestjs/sidequest/compare/v1.5.1...v1.5.2) (2025-08-21)


### Bug Fixes

* fix flaky integration test ([#81](https://github.com/sidequestjs/sidequest/issues/81)) ([a828bd4](https://github.com/sidequestjs/sidequest/commit/a828bd4363b4bcba7d347f584a44965335e214f1))
* replace JSON.stringify with util.inspect for logging ([#79](https://github.com/sidequestjs/sidequest/issues/79)) ([2704907](https://github.com/sidequestjs/sidequest/commit/2704907dd200dc9fc91fc2df3905c51a712784c9))

## [1.5.1](https://github.com/sidequestjs/sidequest/compare/v1.5.0...v1.5.1) (2025-08-21)


### Bug Fixes

* fix unknown type on backend config ([#73](https://github.com/sidequestjs/sidequest/issues/73)) ([f45b440](https://github.com/sidequestjs/sidequest/commit/f45b4405037ee35e13bf2d8427928005fbc4a28b))

# [1.5.0](https://github.com/sidequestjs/sidequest/compare/v1.4.3...v1.5.0) (2025-08-16)


### Features

* Add `countJobsByQueues` to backend implementations and fixed 2 minor bugs ([#70](https://github.com/sidequestjs/sidequest/issues/70)) ([7a22053](https://github.com/sidequestjs/sidequest/commit/7a2205366fcb063e2bb2dc947b3097508b0a893e))

## [1.4.3](https://github.com/sidequestjs/sidequest/compare/v1.4.2...v1.4.3) (2025-08-11)


### Bug Fixes

* set schema name for migrations based on searchPath in PostgresBackend ([#67](https://github.com/sidequestjs/sidequest/issues/67)) ([686afa5](https://github.com/sidequestjs/sidequest/commit/686afa5971b273b215bed553e6482c7249418977))

## [1.4.2](https://github.com/sidequestjs/sidequest/compare/v1.4.1...v1.4.2) (2025-08-08)


### Bug Fixes

* allow passing full configs on sql backends ([#63](https://github.com/sidequestjs/sidequest/issues/63)) ([9820992](https://github.com/sidequestjs/sidequest/commit/9820992887884d36e02f8757bb4cae5067a11495))

## [1.4.1](https://github.com/sidequestjs/sidequest/compare/v1.4.0...v1.4.1) (2025-08-07)


### Bug Fixes

* fixes job enqueue inside CJS jobs ([#60](https://github.com/sidequestjs/sidequest/issues/60)) ([14c959c](https://github.com/sidequestjs/sidequest/commit/14c959c7f130183da0ce27daa520acee389f5c2a))

# [1.4.0](https://github.com/sidequestjs/sidequest/compare/v1.3.0...v1.4.0) (2025-08-07)


### Features

* relative path on script resolution ([#58](https://github.com/sidequestjs/sidequest/issues/58)) ([65cf83a](https://github.com/sidequestjs/sidequest/commit/65cf83aebf66f1707be387b461a1dfc96c2dcd66))

# [1.3.0](https://github.com/sidequestjs/sidequest/compare/v1.2.0...v1.3.0) (2025-08-06)


### Features

* add pooling control for PG knex config ([#53](https://github.com/sidequestjs/sidequest/issues/53)) ([7db5d6b](https://github.com/sidequestjs/sidequest/commit/7db5d6bfb556b7ffdcab9064c5004a46027021f5))

# [1.2.0](https://github.com/sidequestjs/sidequest/compare/v1.1.1...v1.2.0) (2025-08-04)


### Features

* enhance job listing functionality with pattern matching for queue, jobClass, and state ([#50](https://github.com/sidequestjs/sidequest/issues/50)) ([4153dd8](https://github.com/sidequestjs/sidequest/commit/4153dd82d7e662a8892d7d80e3bac351d7ae1fda))

## [1.1.1](https://github.com/sidequestjs/sidequest/compare/v1.1.0...v1.1.1) (2025-08-01)


### Bug Fixes

* improve LazyBackend initialization to ensure single instance creation ([#47](https://github.com/sidequestjs/sidequest/issues/47)) ([2a016d1](https://github.com/sidequestjs/sidequest/commit/2a016d14ec5a1206fda532bb27d1c96d3b3069c4))

# [1.1.0](https://github.com/sidequestjs/sidequest/compare/v1.0.0...v1.1.0) (2025-08-01)


### Features

* add develop branch configuration for prerelease and channel settings ([#46](https://github.com/sidequestjs/sidequest/issues/46)) ([d0f0b57](https://github.com/sidequestjs/sidequest/commit/d0f0b57298befe20f2348827ebcc7be19189356d))

# 1.0.0 (2025-08-01)


### Bug Fixes

* add close method to Engine class for backend cleanup ([90ece50](https://github.com/sidequestjs/sidequest/commit/90ece50437f817e945cf0a80ae6cde27a6f2e07c))
* add engines field to specify required Node.js version ([#42](https://github.com/sidequestjs/sidequest/issues/42)) ([44c9523](https://github.com/sidequestjs/sidequest/commit/44c952332dc5009186356350d5ecbe45f2c55f83))
* author ([ec1734a](https://github.com/sidequestjs/sidequest/commit/ec1734a6128cce771bc112be98df956ac38b6f1f))
* author ([e81372f](https://github.com/sidequestjs/sidequest/commit/e81372fbba592521cee4cf7ad00a20950df831bb))
* changed to patch and fixed job path call on table ([6e2399e](https://github.com/sidequestjs/sidequest/commit/6e2399ef78d96a845cb7d15a97b1af03707ebb1f))
* claim ([b535e98](https://github.com/sidequestjs/sidequest/commit/b535e98a35eeda5ed9746607911f33c831b906f1))
* deduplication ([#58](https://github.com/sidequestjs/sidequest/issues/58)) ([e0d6ae7](https://github.com/sidequestjs/sidequest/commit/e0d6ae7a98c0077b8c605c2bdc9b5590c0d328a2))
* default job state ([626882e](https://github.com/sidequestjs/sidequest/commit/626882ecfc8e63c729d88c019a80a1b76f1ae8a1))
* enqueue ([a1cc0aa](https://github.com/sidequestjs/sidequest/commit/a1cc0aad604646e8f636bdc42747865c384d7cc1))
* ensure consistent path formatting in buildPath function ([55de875](https://github.com/sidequestjs/sidequest/commit/55de8751f74c787f97906d36cb009a72d8fc37e0))
* escape backslashes in file paths for consistency ([36cc48c](https://github.com/sidequestjs/sidequest/commit/36cc48cbd0e540063810f9b5b0d0782789988455))
* fix build of dashboard on windows ([e92f15d](https://github.com/sidequestjs/sidequest/commit/e92f15db381e4b371c085b7f248428dbf1e83c8a))
* Fix Dashboard stats and graph, and removes Redis ([#154](https://github.com/sidequestjs/sidequest/issues/154)) ([b3ab912](https://github.com/sidequestjs/sidequest/commit/b3ab9127a4a6868968b485c403c809536003b6ba))
* fix second shutdown attempt ([295f6b4](https://github.com/sidequestjs/sidequest/commit/295f6b4d0e407d62e2013f10dc3c59bd13f2f87f))
* fixed a few inconsistencies ([54d338d](https://github.com/sidequestjs/sidequest/commit/54d338d0fa57b8cc07a1ae03b3149f595186b0ae))
* fixed time range ([fb19cac](https://github.com/sidequestjs/sidequest/commit/fb19caca2b666808029e5d0ce34b6b40b757b20d))
* fixed yarn lock ([#140](https://github.com/sidequestjs/sidequest/issues/140)) ([68176ec](https://github.com/sidequestjs/sidequest/commit/68176ec78433c1bb359ab8bf6e567b333213c07d))
* format ([c51ecf6](https://github.com/sidequestjs/sidequest/commit/c51ecf6c5911552e04e7bbbe2f41fcf96bbb8b3d))
* Future canceled jobs not running ([#34](https://github.com/sidequestjs/sidequest/issues/34)) ([85a5212](https://github.com/sidequestjs/sidequest/commit/85a52120bfb8e20de94d9115988c8a693846d511))
* improve job failure handling in RetryTransition ([#143](https://github.com/sidequestjs/sidequest/issues/143)) ([f448c35](https://github.com/sidequestjs/sidequest/commit/f448c35f646939997879da184768775fa604d523))
* including migrations on backends ([a670e89](https://github.com/sidequestjs/sidequest/commit/a670e89263f20eff9ad5156b997ecb6f6a9069f2))
* make config parameter optional in Engine.start method ([2359040](https://github.com/sidequestjs/sidequest/commit/23590408b08f5b691dd662cdc2cb54ba66393847))
* min concurrency ([#28](https://github.com/sidequestjs/sidequest/issues/28)) ([5e9877b](https://github.com/sidequestjs/sidequest/commit/5e9877b00a799142430c59a40742f778811c4a89))
* new version ([c104052](https://github.com/sidequestjs/sidequest/commit/c1040523dc2bbaeeb03ccc4284e32738a840ddcb))
* Proper dashboard and Sidequest shutdown ([#16](https://github.com/sidequestjs/sidequest/issues/16)) ([ed1d853](https://github.com/sidequestjs/sidequest/commit/ed1d853f53f0ddbdd2ed15a695adff1d2816b01c))
* publish ([17d036b](https://github.com/sidequestjs/sidequest/commit/17d036b42daba62750d2eca02f149605f134089a))
* publish to npm ([477e9a2](https://github.com/sidequestjs/sidequest/commit/477e9a254f86c82cf9ae52db60af8c07db4ef623))
* queue list ([b09d103](https://github.com/sidequestjs/sidequest/commit/b09d1034d7643376c81555704457bee9b98fe636))
* release ([4b2f4e7](https://github.com/sidequestjs/sidequest/commit/4b2f4e71348a1ec316b749dd9a35cf9cc4438037))
* release ([d731dd2](https://github.com/sidequestjs/sidequest/commit/d731dd2ddc753581b427607edddf3927687f9023))
* release ([b736f50](https://github.com/sidequestjs/sidequest/commit/b736f503147c316568aca8276506d25042f54f0f))
* release ([#26](https://github.com/sidequestjs/sidequest/issues/26)) ([c6093ae](https://github.com/sidequestjs/sidequest/commit/c6093ae964551b18537b4acfb0d30d0b551888dd))
* release next ([66b9329](https://github.com/sidequestjs/sidequest/commit/66b9329c59b17696a10d91f3854c327361bbf1b6))
* release next ([dd9f2af](https://github.com/sidequestjs/sidequest/commit/dd9f2afcc03de79fbb9f70ab83db5191b9dff903))
* release next ([cc4b2bd](https://github.com/sidequestjs/sidequest/commit/cc4b2bdc5800212a9930456ccd9827c4d1488263))
* release next ([586ec83](https://github.com/sidequestjs/sidequest/commit/586ec832cd207af09e2da4ca61d1cf1a9013ea20))
* release.yml ([c37c57c](https://github.com/sidequestjs/sidequest/commit/c37c57c0ee212fcc1eb51973a6ede63c3b066385))
* remove topological ([f25b881](https://github.com/sidequestjs/sidequest/commit/f25b881db0fca3e01db3a4c1ab7b4d0eeecb8e8d))
* remove unused delete button from job view ([#36](https://github.com/sidequestjs/sidequest/issues/36)) ([eedd15f](https://github.com/sidequestjs/sidequest/commit/eedd15f47afe18d8cd2cc9359474ee24e8f8f541))
* removing returning usage from sql backend ([5d61c29](https://github.com/sidequestjs/sidequest/commit/5d61c295ae318ab9e5e7de4848edc3d9011137e3))
* removing version from monorepo ([e4c5a76](https://github.com/sidequestjs/sidequest/commit/e4c5a76a300ddddf3c8f369bef5e1c24e15a46ee))
* removing version script ([e7736a4](https://github.com/sidequestjs/sidequest/commit/e7736a4bff01785d82ad3d2098f7b7cf6fe7d6da))
* revert unlimited jobs ([#23](https://github.com/sidequestjs/sidequest/issues/23)) ([96ccc5d](https://github.com/sidequestjs/sidequest/commit/96ccc5db7aa26fbe9e8ca9b93ebbbd7f77b1677e)), closes [#21](https://github.com/sidequestjs/sidequest/issues/21)
* sending config to sidequest main ([44a314c](https://github.com/sidequestjs/sidequest/commit/44a314cd6c5f4b9f2ed86b2758d97ab1241201b9))
* serialize errors ([#44](https://github.com/sidequestjs/sidequest/issues/44)) ([683b7e1](https://github.com/sidequestjs/sidequest/commit/683b7e118c9be9d75d3963957f3ee4123f09e3b0))
* show more and show less not saving state on page refresh ([#41](https://github.com/sidequestjs/sidequest/issues/41)) ([fcc99e7](https://github.com/sidequestjs/sidequest/commit/fcc99e77c2db4ff8dc7018913c2d9355aa88e1a8))
* states ([81be666](https://github.com/sidequestjs/sidequest/commit/81be6661cbddf227c2478f77247e5e9e3505bd63))
* test ([1da410e](https://github.com/sidequestjs/sidequest/commit/1da410e8bef669d42663f3c5229a626132a7352b))
* test ([8444aef](https://github.com/sidequestjs/sidequest/commit/8444aefcc850c1db76d27fb96fe5fbd150e2a87b))
* Unhandled error on Executor Manager ([#24](https://github.com/sidequestjs/sidequest/issues/24)) ([81bd5e0](https://github.com/sidequestjs/sidequest/commit/81bd5e084a68fa9617efb97a94af10b736536eb5))
* update default concurrency value in documentation ([dfc328d](https://github.com/sidequestjs/sidequest/commit/dfc328d680f9588534b0cbcafed16326d31c49a1))
* update jobDefaults handling and add engine tests ([#4](https://github.com/sidequestjs/sidequest/issues/4)) ([bbd8dde](https://github.com/sidequestjs/sidequest/commit/bbd8dde20315a2092e979cc48b58646136eeee73))
* update logger import to use @sidequest/core ([d1f7825](https://github.com/sidequestjs/sidequest/commit/d1f782519f9e45f528f896fb2001b63cecb0250d))
* update staleJobs test to handle negative timeout values ([514b330](https://github.com/sidequestjs/sidequest/commit/514b33076773e6b2b9b7f1acc3d1b6284e31c1bf))
* url ([74651c2](https://github.com/sidequestjs/sidequest/commit/74651c23bf22a0636aa9d02f0cc3693fe3586ed6))
* using exec ([80e47be](https://github.com/sidequestjs/sidequest/commit/80e47bebd37353311abff590afefdc38c0d64c75))
* using personal token ([#25](https://github.com/sidequestjs/sidequest/issues/25)) ([91c5834](https://github.com/sidequestjs/sidequest/commit/91c58343421dc691fa108317c505c470b70c755a))
* using sidequest release app ([1ecf1a7](https://github.com/sidequestjs/sidequest/commit/1ecf1a791c8418ebf17f14214704ba33a652fcf9))
* version ([be0e7d4](https://github.com/sidequestjs/sidequest/commit/be0e7d47ffe5601ba52b088c98b5e4badaf8c08e))
* versions ([903c601](https://github.com/sidequestjs/sidequest/commit/903c60132fd6d28ede4ef66e505cdbf1667bf24f))
* versions ([abd5a80](https://github.com/sidequestjs/sidequest/commit/abd5a80c7eaed20c8257af9c3323db445c50a066))
* yarn lock ([d9cdc68](https://github.com/sidequestjs/sidequest/commit/d9cdc68ad126934e0e6c041fcc3a59c5dd64715f))


### Features

* `Sidequest.build` from job ([#20](https://github.com/sidequestjs/sidequest/issues/20)) ([d7f5286](https://github.com/sidequestjs/sidequest/commit/d7f52866b3a3d3f786c368218545d5c02b9dc7aa))
* add better logging and tests for createBackendFromDriver function ([#142](https://github.com/sidequestjs/sidequest/issues/142)) ([00942cb](https://github.com/sidequestjs/sidequest/commit/00942cb301a020f2fd50c700817b5f7ed454ad85))
* add comprehensive test suite for job and queue management ([a775de8](https://github.com/sidequestjs/sidequest/commit/a775de8b392e39a84d69c45bf5250de447fe5ebc))
* add job builder ([#39](https://github.com/sidequestjs/sidequest/issues/39)) ([5af07bb](https://github.com/sidequestjs/sidequest/commit/5af07bbf3cf693794f051ab7d497e2bc0ec0b8bb))
* add JobData to job object. ([#171](https://github.com/sidequestjs/sidequest/issues/171)) ([c61df01](https://github.com/sidequestjs/sidequest/commit/c61df01deb5e072644bb28172a5904daf8d2c75e))
* add nullable timeout column to sidequest_jobs table ([b2bacbd](https://github.com/sidequestjs/sidequest/commit/b2bacbd639ffaacae596dcdf2d0e15d8bf1db7f8))
* add timeout on executor start ([5c0164d](https://github.com/sidequestjs/sidequest/commit/5c0164d6c8e4ef19ae6a7b82c93614185ff45658))
* add updateJob method and related tests for job management ([6f7a024](https://github.com/sidequestjs/sidequest/commit/6f7a02418a115fcdd94649a1150cf7a8d06614d4))
* added cli ([442b031](https://github.com/sidequestjs/sidequest/commit/442b0316c8ad81b9911878d28f60f1db5c01522a))
* added dasy ui ([59411e9](https://github.com/sidequestjs/sidequest/commit/59411e99a0008d7caaeaa37428153038608231a7))
* added job view - work in progress ([e274af6](https://github.com/sidequestjs/sidequest/commit/e274af6941225fce24d99f7384a9b7a6e9dd6a1f))
* added mongodb backend ([#155](https://github.com/sidequestjs/sidequest/issues/155)) ([0149d82](https://github.com/sidequestjs/sidequest/commit/0149d82d7491cfb32d9ff97655c3c71b0e0a7777))
* allow nested jobs ([#55](https://github.com/sidequestjs/sidequest/issues/55)) ([a8ff7f0](https://github.com/sidequestjs/sidequest/commit/a8ff7f0b1f177461be3dc6672a3a3a4b73dca752))
* allowing to set maxAttempts and availabeAt on enqueuing job. ([#77](https://github.com/sidequestjs/sidequest/issues/77)) ([c469da2](https://github.com/sidequestjs/sidequest/commit/c469da28803444ef3ba0c1420cd98c3d9c1a0ab6))
* basic auth on dashboard ([#66](https://github.com/sidequestjs/sidequest/issues/66)) ([add020b](https://github.com/sidequestjs/sidequest/commit/add020b275f8b3b2fa01094b5f3ccd805d883c61))
* cancel job ([8434c70](https://github.com/sidequestjs/sidequest/commit/8434c708a27916bc1201f658912a5e54c63cd06d))
* cleanup job and coverage ([#76](https://github.com/sidequestjs/sidequest/issues/76)) ([f58f2d0](https://github.com/sidequestjs/sidequest/commit/f58f2d0e011423707eef95b7bc1a23aa358f4b43))
* dashboard config ([e6741d2](https://github.com/sidequestjs/sidequest/commit/e6741d2c3990ba72e86c9d5905782ac2118b8eb5))
* enhance queue management with defaults and force update options ([#5](https://github.com/sidequestjs/sidequest/issues/5)) ([40acbec](https://github.com/sidequestjs/sidequest/commit/40acbec8386627f90b29de9dd4937610d4153dbe))
* Facades and better transitions ([#161](https://github.com/sidequestjs/sidequest/issues/161)) ([8066f5d](https://github.com/sidequestjs/sidequest/commit/8066f5dfa4c30ecf00fcf1d5502c4376652b6ed7))
* implement backend initialization and configuration for dashboard ([34737b9](https://github.com/sidequestjs/sidequest/commit/34737b93c5d1abedb3e9cc102e69f653b1d632e6))
* implement staleJobs method for job management across backends ([a10959a](https://github.com/sidequestjs/sidequest/commit/a10959af7603578cf03c40a3655fca3df3906153))
* improve DX ([#71](https://github.com/sidequestjs/sidequest/issues/71)) ([075b589](https://github.com/sidequestjs/sidequest/commit/075b589cf9bfce49086af09b036200f4552cf9e4))
* job flow control ([#42](https://github.com/sidequestjs/sidequest/issues/42)) ([f7dd600](https://github.com/sidequestjs/sidequest/commit/f7dd6006e2a6f7ea8fb56dac8f85a6d831c8eb35))
* job list ([5208e7c](https://github.com/sidequestjs/sidequest/commit/5208e7c735acd9194654d394dfb0744accc7adeb))
* job view ([31f6112](https://github.com/sidequestjs/sidequest/commit/31f6112d9b47ed430dfbd8a2abee841b38812458))
* mock shared-runner for improved test isolation in main.test.ts ([a1bfac2](https://github.com/sidequestjs/sidequest/commit/a1bfac2b1e3b473c5cf63d9b6bf66db4010b9626))
* move magic numbers to Sidequest config ([#147](https://github.com/sidequestjs/sidequest/issues/147)) ([f701f1a](https://github.com/sidequestjs/sidequest/commit/f701f1a960b860ff586548187a4371509fb67413))
* moving args to run function ([225bee3](https://github.com/sidequestjs/sidequest/commit/225bee37dfb10505c545abde346fea7a94a9273d))
* realising staled claimed and running jobs ([#59](https://github.com/sidequestjs/sidequest/issues/59)) ([148f64c](https://github.com/sidequestjs/sidequest/commit/148f64c400555ddf0963070ceafec9b4a78e6268))
* recurring jobs ([#12](https://github.com/sidequestjs/sidequest/issues/12)) ([cd66663](https://github.com/sidequestjs/sidequest/commit/cd6666318fb1786e09354954c39cc76ed24c11b5))
* redis backend ([#129](https://github.com/sidequestjs/sidequest/issues/129)) ([f08e9b7](https://github.com/sidequestjs/sidequest/commit/f08e9b7adee1a74be6949b27e8c862f9e58b69ce))
* refactor backend import paths and introduce setTestBackend function ([f5439da](https://github.com/sidequestjs/sidequest/commit/f5439da844dd0b61276760821ef53674f3929099))
* refactor uniquiness ([#67](https://github.com/sidequestjs/sidequest/issues/67)) ([fbea055](https://github.com/sidequestjs/sidequest/commit/fbea0552e7d31d56dfabe46042e144a657640f6c))
* removed dev server ([ffe153d](https://github.com/sidequestjs/sidequest/commit/ffe153d2da25ae483ab6d93c507cbd8cfca49296))
* rerun jobs and fixing small issues ([6e2925c](https://github.com/sidequestjs/sidequest/commit/6e2925c2ac599f6f35b8b7e69c813707bc18f986))
* routines ([6abf0d4](https://github.com/sidequestjs/sidequest/commit/6abf0d4d8514fd94d0483e2806c043b68051f3f4))
* run from dashboard ([b65b058](https://github.com/sidequestjs/sidequest/commit/b65b058a45094ace93fcd9801b02e885d7e56b87))
* unlimited jobs ([#21](https://github.com/sidequestjs/sidequest/issues/21)) ([0055f4a](https://github.com/sidequestjs/sidequest/commit/0055f4ac3ba51e193fb4f14268938f266fbfa6c0))
* Update branch triggers to include 'develop' for workflows ([#1](https://github.com/sidequestjs/sidequest/issues/1)) ([eef8a35](https://github.com/sidequestjs/sidequest/commit/eef8a352fd7ecd067758db2732abc9cbdcf61e48))
* Update job arguments type to array in SidequestDashboard ([a920c27](https://github.com/sidequestjs/sidequest/commit/a920c27090757967497bab1f1cd85ee083937a3d))


### Reverts

* Revert "Chore/fix env ([#166](https://github.com/sidequestjs/sidequest/issues/166))" ([#167](https://github.com/sidequestjs/sidequest/issues/167)) ([6254959](https://github.com/sidequestjs/sidequest/commit/625495918bf599edcb3f78d68f34f065f95360e7))

# [1.0.0-next.22](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.21...v1.0.0-next.22) (2025-07-31)


### Bug Fixes

* new version ([c104052](https://github.com/sidequestjs/sidequest/commit/c1040523dc2bbaeeb03ccc4284e32738a840ddcb))

# [1.0.0-next.22](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.21...v1.0.0-next.22) (2025-07-31)


### Bug Fixes

* new version ([c104052](https://github.com/sidequestjs/sidequest/commit/c1040523dc2bbaeeb03ccc4284e32738a840ddcb))

# [1.0.0-next.21](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.20...v1.0.0-next.21) (2025-07-31)


### Bug Fixes

* add engines field to specify required Node.js version ([#42](https://github.com/sidequestjs/sidequest/issues/42)) ([44c9523](https://github.com/sidequestjs/sidequest/commit/44c952332dc5009186356350d5ecbe45f2c55f83))

# [1.0.0-next.20](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.19...v1.0.0-next.20) (2025-07-31)


### Bug Fixes

* show more and show less not saving state on page refresh ([#41](https://github.com/sidequestjs/sidequest/issues/41)) ([fcc99e7](https://github.com/sidequestjs/sidequest/commit/fcc99e77c2db4ff8dc7018913c2d9355aa88e1a8))

# [1.0.0-next.19](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.18...v1.0.0-next.19) (2025-07-31)


### Bug Fixes

* remove unused delete button from job view ([#36](https://github.com/sidequestjs/sidequest/issues/36)) ([eedd15f](https://github.com/sidequestjs/sidequest/commit/eedd15f47afe18d8cd2cc9359474ee24e8f8f541))

# [1.0.0-next.18](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.17...v1.0.0-next.18) (2025-07-31)


### Bug Fixes

* Future canceled jobs not running ([#34](https://github.com/sidequestjs/sidequest/issues/34)) ([85a5212](https://github.com/sidequestjs/sidequest/commit/85a52120bfb8e20de94d9115988c8a693846d511))

# [1.0.0-next.17](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.16...v1.0.0-next.17) (2025-07-30)


### Bug Fixes

* min concurrency ([#28](https://github.com/sidequestjs/sidequest/issues/28)) ([5e9877b](https://github.com/sidequestjs/sidequest/commit/5e9877b00a799142430c59a40742f778811c4a89))

# [1.0.0-next.16](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.15...v1.0.0-next.16) (2025-07-30)


### Bug Fixes

* update default concurrency value in documentation ([dfc328d](https://github.com/sidequestjs/sidequest/commit/dfc328d680f9588534b0cbcafed16326d31c49a1))

# [1.0.0-next.15](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.14...v1.0.0-next.15) (2025-07-30)


### Bug Fixes

* author ([ec1734a](https://github.com/sidequestjs/sidequest/commit/ec1734a6128cce771bc112be98df956ac38b6f1f))
* author ([e81372f](https://github.com/sidequestjs/sidequest/commit/e81372fbba592521cee4cf7ad00a20950df831bb))
* Proper dashboard and Sidequest shutdown ([#16](https://github.com/sidequestjs/sidequest/issues/16)) ([ed1d853](https://github.com/sidequestjs/sidequest/commit/ed1d853f53f0ddbdd2ed15a695adff1d2816b01c))
* release ([4b2f4e7](https://github.com/sidequestjs/sidequest/commit/4b2f4e71348a1ec316b749dd9a35cf9cc4438037))
* release ([#26](https://github.com/sidequestjs/sidequest/issues/26)) ([c6093ae](https://github.com/sidequestjs/sidequest/commit/c6093ae964551b18537b4acfb0d30d0b551888dd))
* release.yml ([c37c57c](https://github.com/sidequestjs/sidequest/commit/c37c57c0ee212fcc1eb51973a6ede63c3b066385))
* revert unlimited jobs ([#23](https://github.com/sidequestjs/sidequest/issues/23)) ([96ccc5d](https://github.com/sidequestjs/sidequest/commit/96ccc5db7aa26fbe9e8ca9b93ebbbd7f77b1677e)), closes [#21](https://github.com/sidequestjs/sidequest/issues/21)
* Unhandled error on Executor Manager ([#24](https://github.com/sidequestjs/sidequest/issues/24)) ([81bd5e0](https://github.com/sidequestjs/sidequest/commit/81bd5e084a68fa9617efb97a94af10b736536eb5))
* using personal token ([#25](https://github.com/sidequestjs/sidequest/issues/25)) ([91c5834](https://github.com/sidequestjs/sidequest/commit/91c58343421dc691fa108317c505c470b70c755a))
* using sidequest release app ([1ecf1a7](https://github.com/sidequestjs/sidequest/commit/1ecf1a791c8418ebf17f14214704ba33a652fcf9))


### Features

* `Sidequest.build` from job ([#20](https://github.com/sidequestjs/sidequest/issues/20)) ([d7f5286](https://github.com/sidequestjs/sidequest/commit/d7f52866b3a3d3f786c368218545d5c02b9dc7aa))
* unlimited jobs ([#21](https://github.com/sidequestjs/sidequest/issues/21)) ([0055f4a](https://github.com/sidequestjs/sidequest/commit/0055f4ac3ba51e193fb4f14268938f266fbfa6c0))

# [1.0.0-next.14](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.13...v1.0.0-next.14) (2025-07-25)

### Features

- recurring jobs ([#12](https://github.com/sidequestjs/sidequest/issues/12)) ([cd66663](https://github.com/sidequestjs/sidequest/commit/cd6666318fb1786e09354954c39cc76ed24c11b5))

# [1.0.0-next.13](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.12...v1.0.0-next.13) (2025-07-25)

### Features

- enhance queue management with defaults and force update options ([#5](https://github.com/sidequestjs/sidequest/issues/5)) ([40acbec](https://github.com/sidequestjs/sidequest/commit/40acbec8386627f90b29de9dd4937610d4153dbe))

# [1.0.0-next.12](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.11...v1.0.0-next.12) (2025-07-24)

### Bug Fixes

- update jobDefaults handling and add engine tests ([#4](https://github.com/sidequestjs/sidequest/issues/4)) ([bbd8dde](https://github.com/sidequestjs/sidequest/commit/bbd8dde20315a2092e979cc48b58646136eeee73))

# [1.0.0-next.11](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.10...v1.0.0-next.11) (2025-07-24)

### Bug Fixes

- including migrations on backends ([a670e89](https://github.com/sidequestjs/sidequest/commit/a670e89263f20eff9ad5156b997ecb6f6a9069f2))

# [1.0.0-next.10](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.9...v1.0.0-next.10) (2025-07-24)

### Bug Fixes

- release next ([66b9329](https://github.com/sidequestjs/sidequest/commit/66b9329c59b17696a10d91f3854c327361bbf1b6))

# [1.0.0-next.9](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.8...v1.0.0-next.9) (2025-07-24)

### Bug Fixes

- release next ([dd9f2af](https://github.com/sidequestjs/sidequest/commit/dd9f2afcc03de79fbb9f70ab83db5191b9dff903))
- removing version from monorepo ([e4c5a76](https://github.com/sidequestjs/sidequest/commit/e4c5a76a300ddddf3c8f369bef5e1c24e15a46ee))

# [1.0.0-next.9](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.8...v1.0.0-next.9) (2025-07-24)

### Bug Fixes

- release next ([dd9f2af](https://github.com/sidequestjs/sidequest/commit/dd9f2afcc03de79fbb9f70ab83db5191b9dff903))

# [1.0.0-next.8](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.7...v1.0.0-next.8) (2025-07-24)

### Bug Fixes

- release next ([cc4b2bd](https://github.com/sidequestjs/sidequest/commit/cc4b2bdc5800212a9930456ccd9827c4d1488263))
- versions ([903c601](https://github.com/sidequestjs/sidequest/commit/903c60132fd6d28ede4ef66e505cdbf1667bf24f))

# [1.0.0-next.7](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.6...v1.0.0-next.7) (2025-07-24)

### Bug Fixes

- remove topological ([f25b881](https://github.com/sidequestjs/sidequest/commit/f25b881db0fca3e01db3a4c1ab7b4d0eeecb8e8d))
- removing version script ([e7736a4](https://github.com/sidequestjs/sidequest/commit/e7736a4bff01785d82ad3d2098f7b7cf6fe7d6da))
- versions ([abd5a80](https://github.com/sidequestjs/sidequest/commit/abd5a80c7eaed20c8257af9c3323db445c50a066))
- yarn lock ([d9cdc68](https://github.com/sidequestjs/sidequest/commit/d9cdc68ad126934e0e6c041fcc3a59c5dd64715f))

# [1.0.0-next.6](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.5...v1.0.0-next.6) (2025-07-24)

### Bug Fixes

- publish ([17d036b](https://github.com/sidequestjs/sidequest/commit/17d036b42daba62750d2eca02f149605f134089a))

# [1.0.0-next.5](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.4...v1.0.0-next.5) (2025-07-24)

### Bug Fixes

- release next ([586ec83](https://github.com/sidequestjs/sidequest/commit/586ec832cd207af09e2da4ca61d1cf1a9013ea20))

# [1.0.0-next.4](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.3...v1.0.0-next.4) (2025-07-24)

### Bug Fixes

- release ([d731dd2](https://github.com/sidequestjs/sidequest/commit/d731dd2ddc753581b427607edddf3927687f9023))
- release ([b736f50](https://github.com/sidequestjs/sidequest/commit/b736f503147c316568aca8276506d25042f54f0f))
- test ([1da410e](https://github.com/sidequestjs/sidequest/commit/1da410e8bef669d42663f3c5229a626132a7352b))
- test ([8444aef](https://github.com/sidequestjs/sidequest/commit/8444aefcc850c1db76d27fb96fe5fbd150e2a87b))
- version ([be0e7d4](https://github.com/sidequestjs/sidequest/commit/be0e7d47ffe5601ba52b088c98b5e4badaf8c08e))

# [1.0.0-next.3](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.2...v1.0.0-next.3) (2025-07-24)

### Bug Fixes

- using exec ([80e47be](https://github.com/sidequestjs/sidequest/commit/80e47bebd37353311abff590afefdc38c0d64c75))

# [1.0.0-next.2](https://github.com/sidequestjs/sidequest/compare/v1.0.0-next.1...v1.0.0-next.2) (2025-07-24)

### Bug Fixes

- publish to npm ([477e9a2](https://github.com/sidequestjs/sidequest/commit/477e9a254f86c82cf9ae52db60af8c07db4ef623))

# 1.0.0-next.1 (2025-07-24)

### Bug Fixes

- add close method to Engine class for backend cleanup ([90ece50](https://github.com/sidequestjs/sidequest/commit/90ece50437f817e945cf0a80ae6cde27a6f2e07c))
- changed to patch and fixed job path call on table ([6e2399e](https://github.com/sidequestjs/sidequest/commit/6e2399ef78d96a845cb7d15a97b1af03707ebb1f))
- claim ([b535e98](https://github.com/sidequestjs/sidequest/commit/b535e98a35eeda5ed9746607911f33c831b906f1))
- deduplication ([#58](https://github.com/sidequestjs/sidequest/issues/58)) ([e0d6ae7](https://github.com/sidequestjs/sidequest/commit/e0d6ae7a98c0077b8c605c2bdc9b5590c0d328a2))
- default job state ([626882e](https://github.com/sidequestjs/sidequest/commit/626882ecfc8e63c729d88c019a80a1b76f1ae8a1))
- enqueue ([a1cc0aa](https://github.com/sidequestjs/sidequest/commit/a1cc0aad604646e8f636bdc42747865c384d7cc1))
- ensure consistent path formatting in buildPath function ([55de875](https://github.com/sidequestjs/sidequest/commit/55de8751f74c787f97906d36cb009a72d8fc37e0))
- escape backslashes in file paths for consistency ([36cc48c](https://github.com/sidequestjs/sidequest/commit/36cc48cbd0e540063810f9b5b0d0782789988455))
- fix build of dashboard on windows ([e92f15d](https://github.com/sidequestjs/sidequest/commit/e92f15db381e4b371c085b7f248428dbf1e83c8a))
- Fix Dashboard stats and graph, and removes Redis ([#154](https://github.com/sidequestjs/sidequest/issues/154)) ([b3ab912](https://github.com/sidequestjs/sidequest/commit/b3ab9127a4a6868968b485c403c809536003b6ba))
- fix second shutdown attempt ([295f6b4](https://github.com/sidequestjs/sidequest/commit/295f6b4d0e407d62e2013f10dc3c59bd13f2f87f))
- fixed a few inconsistencies ([54d338d](https://github.com/sidequestjs/sidequest/commit/54d338d0fa57b8cc07a1ae03b3149f595186b0ae))
- fixed time range ([fb19cac](https://github.com/sidequestjs/sidequest/commit/fb19caca2b666808029e5d0ce34b6b40b757b20d))
- fixed yarn lock ([#140](https://github.com/sidequestjs/sidequest/issues/140)) ([68176ec](https://github.com/sidequestjs/sidequest/commit/68176ec78433c1bb359ab8bf6e567b333213c07d))
- format ([c51ecf6](https://github.com/sidequestjs/sidequest/commit/c51ecf6c5911552e04e7bbbe2f41fcf96bbb8b3d))
- improve job failure handling in RetryTransition ([#143](https://github.com/sidequestjs/sidequest/issues/143)) ([f448c35](https://github.com/sidequestjs/sidequest/commit/f448c35f646939997879da184768775fa604d523))
- make config parameter optional in Engine.start method ([2359040](https://github.com/sidequestjs/sidequest/commit/23590408b08f5b691dd662cdc2cb54ba66393847))
- queue list ([b09d103](https://github.com/sidequestjs/sidequest/commit/b09d1034d7643376c81555704457bee9b98fe636))
- removing returning usage from sql backend ([5d61c29](https://github.com/sidequestjs/sidequest/commit/5d61c295ae318ab9e5e7de4848edc3d9011137e3))
- sending config to sidequest main ([44a314c](https://github.com/sidequestjs/sidequest/commit/44a314cd6c5f4b9f2ed86b2758d97ab1241201b9))
- serialize errors ([#44](https://github.com/sidequestjs/sidequest/issues/44)) ([683b7e1](https://github.com/sidequestjs/sidequest/commit/683b7e118c9be9d75d3963957f3ee4123f09e3b0))
- states ([81be666](https://github.com/sidequestjs/sidequest/commit/81be6661cbddf227c2478f77247e5e9e3505bd63))
- update logger import to use @sidequest/core ([d1f7825](https://github.com/sidequestjs/sidequest/commit/d1f782519f9e45f528f896fb2001b63cecb0250d))
- update staleJobs test to handle negative timeout values ([514b330](https://github.com/sidequestjs/sidequest/commit/514b33076773e6b2b9b7f1acc3d1b6284e31c1bf))
- url ([74651c2](https://github.com/sidequestjs/sidequest/commit/74651c23bf22a0636aa9d02f0cc3693fe3586ed6))

### Features

- add better logging and tests for createBackendFromDriver function ([#142](https://github.com/sidequestjs/sidequest/issues/142)) ([00942cb](https://github.com/sidequestjs/sidequest/commit/00942cb301a020f2fd50c700817b5f7ed454ad85))
- add comprehensive test suite for job and queue management ([a775de8](https://github.com/sidequestjs/sidequest/commit/a775de8b392e39a84d69c45bf5250de447fe5ebc))
- add job builder ([#39](https://github.com/sidequestjs/sidequest/issues/39)) ([5af07bb](https://github.com/sidequestjs/sidequest/commit/5af07bbf3cf693794f051ab7d497e2bc0ec0b8bb))
- add JobData to job object. ([#171](https://github.com/sidequestjs/sidequest/issues/171)) ([c61df01](https://github.com/sidequestjs/sidequest/commit/c61df01deb5e072644bb28172a5904daf8d2c75e))
- add nullable timeout column to sidequest_jobs table ([b2bacbd](https://github.com/sidequestjs/sidequest/commit/b2bacbd639ffaacae596dcdf2d0e15d8bf1db7f8))
- add timeout on executor start ([5c0164d](https://github.com/sidequestjs/sidequest/commit/5c0164d6c8e4ef19ae6a7b82c93614185ff45658))
- add updateJob method and related tests for job management ([6f7a024](https://github.com/sidequestjs/sidequest/commit/6f7a02418a115fcdd94649a1150cf7a8d06614d4))
- added cli ([442b031](https://github.com/sidequestjs/sidequest/commit/442b0316c8ad81b9911878d28f60f1db5c01522a))
- added dasy ui ([59411e9](https://github.com/sidequestjs/sidequest/commit/59411e99a0008d7caaeaa37428153038608231a7))
- added job view - work in progress ([e274af6](https://github.com/sidequestjs/sidequest/commit/e274af6941225fce24d99f7384a9b7a6e9dd6a1f))
- added mongodb backend ([#155](https://github.com/sidequestjs/sidequest/issues/155)) ([0149d82](https://github.com/sidequestjs/sidequest/commit/0149d82d7491cfb32d9ff97655c3c71b0e0a7777))
- allow nested jobs ([#55](https://github.com/sidequestjs/sidequest/issues/55)) ([a8ff7f0](https://github.com/sidequestjs/sidequest/commit/a8ff7f0b1f177461be3dc6672a3a3a4b73dca752))
- allowing to set maxAttempts and availabeAt on enqueuing job. ([#77](https://github.com/sidequestjs/sidequest/issues/77)) ([c469da2](https://github.com/sidequestjs/sidequest/commit/c469da28803444ef3ba0c1420cd98c3d9c1a0ab6))
- basic auth on dashboard ([#66](https://github.com/sidequestjs/sidequest/issues/66)) ([add020b](https://github.com/sidequestjs/sidequest/commit/add020b275f8b3b2fa01094b5f3ccd805d883c61))
- cancel job ([8434c70](https://github.com/sidequestjs/sidequest/commit/8434c708a27916bc1201f658912a5e54c63cd06d))
- cleanup job and coverage ([#76](https://github.com/sidequestjs/sidequest/issues/76)) ([f58f2d0](https://github.com/sidequestjs/sidequest/commit/f58f2d0e011423707eef95b7bc1a23aa358f4b43))
- dashboard config ([e6741d2](https://github.com/sidequestjs/sidequest/commit/e6741d2c3990ba72e86c9d5905782ac2118b8eb5))
- Facades and better transitions ([#161](https://github.com/sidequestjs/sidequest/issues/161)) ([8066f5d](https://github.com/sidequestjs/sidequest/commit/8066f5dfa4c30ecf00fcf1d5502c4376652b6ed7))
- implement backend initialization and configuration for dashboard ([34737b9](https://github.com/sidequestjs/sidequest/commit/34737b93c5d1abedb3e9cc102e69f653b1d632e6))
- implement staleJobs method for job management across backends ([a10959a](https://github.com/sidequestjs/sidequest/commit/a10959af7603578cf03c40a3655fca3df3906153))
- improve DX ([#71](https://github.com/sidequestjs/sidequest/issues/71)) ([075b589](https://github.com/sidequestjs/sidequest/commit/075b589cf9bfce49086af09b036200f4552cf9e4))
- job flow control ([#42](https://github.com/sidequestjs/sidequest/issues/42)) ([f7dd600](https://github.com/sidequestjs/sidequest/commit/f7dd6006e2a6f7ea8fb56dac8f85a6d831c8eb35))
- job list ([5208e7c](https://github.com/sidequestjs/sidequest/commit/5208e7c735acd9194654d394dfb0744accc7adeb))
- job view ([31f6112](https://github.com/sidequestjs/sidequest/commit/31f6112d9b47ed430dfbd8a2abee841b38812458))
- mock shared-runner for improved test isolation in main.test.ts ([a1bfac2](https://github.com/sidequestjs/sidequest/commit/a1bfac2b1e3b473c5cf63d9b6bf66db4010b9626))
- move magic numbers to Sidequest config ([#147](https://github.com/sidequestjs/sidequest/issues/147)) ([f701f1a](https://github.com/sidequestjs/sidequest/commit/f701f1a960b860ff586548187a4371509fb67413))
- moving args to run function ([225bee3](https://github.com/sidequestjs/sidequest/commit/225bee37dfb10505c545abde346fea7a94a9273d))
- realising staled claimed and running jobs ([#59](https://github.com/sidequestjs/sidequest/issues/59)) ([148f64c](https://github.com/sidequestjs/sidequest/commit/148f64c400555ddf0963070ceafec9b4a78e6268))
- redis backend ([#129](https://github.com/sidequestjs/sidequest/issues/129)) ([f08e9b7](https://github.com/sidequestjs/sidequest/commit/f08e9b7adee1a74be6949b27e8c862f9e58b69ce))
- refactor backend import paths and introduce setTestBackend function ([f5439da](https://github.com/sidequestjs/sidequest/commit/f5439da844dd0b61276760821ef53674f3929099))
- refactor uniquiness ([#67](https://github.com/sidequestjs/sidequest/issues/67)) ([fbea055](https://github.com/sidequestjs/sidequest/commit/fbea0552e7d31d56dfabe46042e144a657640f6c))
- removed dev server ([ffe153d](https://github.com/sidequestjs/sidequest/commit/ffe153d2da25ae483ab6d93c507cbd8cfca49296))
- rerun jobs and fixing small issues ([6e2925c](https://github.com/sidequestjs/sidequest/commit/6e2925c2ac599f6f35b8b7e69c813707bc18f986))
- routines ([6abf0d4](https://github.com/sidequestjs/sidequest/commit/6abf0d4d8514fd94d0483e2806c043b68051f3f4))
- run from dashboard ([b65b058](https://github.com/sidequestjs/sidequest/commit/b65b058a45094ace93fcd9801b02e885d7e56b87))
- Update branch triggers to include 'develop' for workflows ([#1](https://github.com/sidequestjs/sidequest/issues/1)) ([eef8a35](https://github.com/sidequestjs/sidequest/commit/eef8a352fd7ecd067758db2732abc9cbdcf61e48))
- Update job arguments type to array in SidequestDashboard ([a920c27](https://github.com/sidequestjs/sidequest/commit/a920c27090757967497bab1f1cd85ee083937a3d))

### Reverts

- Revert "Chore/fix env ([#166](https://github.com/sidequestjs/sidequest/issues/166))" ([#167](https://github.com/sidequestjs/sidequest/issues/167)) ([6254959](https://github.com/sidequestjs/sidequest/commit/625495918bf599edcb3f78d68f34f065f95360e7))
