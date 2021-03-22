'use strict';

var dbm;
var type;
var seed;

/**
	* We receive the dbmigrate dependency from dbmigrate initially.
	* This enables us to not have to rely on NODE_PATH.
	*/
exports.setup = function(options, seedLink) {
	dbm = options.dbmigrate;
	type = dbm.dataType;
	seed = seedLink;
};

exports.up = function(db) {
	db.runSql("CREATE TYPE ticket_status AS ENUM ('Queued', 'Assigned', 'Working', 'Completed', 'Rejected')");
	return db.createTable('ticket',
	{
		id: {
			type: 'int',
			primaryKey: true,
			autoIncrement: true
		},
		posttime: {
			type: 'timestamp',
			notNull: false,
	    defaultValue: new String('(now() at time zone \'UTC\')')
		},
		status: {
			type: 'ticket_status',
			notNull: true,
			defaultValue: 'Queued',
		},
		creator: {
			type: 'int',
			notNull: true,
			foreignKey: {
				name: 'ticket_creator_user_id_fk',
				table: 'user',
				rules: {
					onDelete: 'RESTRICT',
					onUpdate: 'CASCADE',
				},
				mapping: 'id'
			}
		},
		title: {
			type: 'text',
			notNull: 'true'
		},
		body: {
			type: 'text',
			notNull: 'true'
		}
	});
};

exports.down = function(db) {
	db.dropTable('ticket', {});
	return db.runSql("DROP TYPE ticket_status", []);
};

exports._meta = {
	"version": 1
};
