import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793372613152 implements MigrationInterface {
  name = 'InitialSchema1793372613152';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "client_key" character varying NOT NULL, "request_hash" character varying NOT NULL, "status" character varying NOT NULL, "amount_cents" integer NOT NULL, "charge_id" character varying, "card_last4" character varying(4) NOT NULL, "decline_code" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_payment_attempt_client_key" UNIQUE ("order_id", "client_key"), CONSTRAINT "PK_a0d8a67c07a0fef98dfd20214e5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_payment_attempt_one_active_per_order" ON "payment_attempts" ("order_id") WHERE status IN ('PROCESSING', 'SUCCEEDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "webhook_events" ("event_id" character varying NOT NULL, "type" character varying NOT NULL, "payload" jsonb NOT NULL, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_eca7d9af1d5bb2184a201ed250d" PRIMARY KEY ("event_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "method" character varying NOT NULL, "status" character varying NOT NULL, "amount_cents" integer NOT NULL, "gateway_refund_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a42db6369017df60549539f5567" UNIQUE ("order_id"), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" SERIAL NOT NULL, "channel" character varying NOT NULL, "payment_method" character varying NOT NULL, "status" character varying NOT NULL, "subtotal_cents" integer NOT NULL, "discount_cents" integer NOT NULL, "coupon" jsonb, "delivery_fee_cents" integer NOT NULL, "total_cents" integer NOT NULL, "tax_base_cents" integer NOT NULL, "tax_cents" integer NOT NULL, "delivery" jsonb, "idempotency_key" character varying, "request_hash" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4e174e347d448617acdf98fef0d" UNIQUE ("number"), CONSTRAINT "UQ_59d6b7756aeb6cbb43a093d15a1" UNIQUE ("idempotency_key"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON "orders" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "position" integer NOT NULL, "type" character varying NOT NULL, "sku" character varying NOT NULL, "name" character varying NOT NULL, "quantity" integer NOT NULL, "unit_price_cents" integer NOT NULL, "upgrade_large" boolean NOT NULL, "modifiers" jsonb NOT NULL, "line_total_cents" integer NOT NULL, "order_id" uuid, CONSTRAINT "PK_627dcd7f1d707de4df241b2da6b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "from_status" character varying, "to_status" character varying NOT NULL, "actor" character varying NOT NULL, "reason" character varying, "at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "order_id" uuid, CONSTRAINT "PK_e6c66d853f155531985fc4f6ec8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying NOT NULL, "order_id" uuid NOT NULL, "actor_id" character varying NOT NULL, "actor_username" character varying NOT NULL, "actor_role" character varying NOT NULL, "reason" character varying, "data" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_814321b4aeec81311f7fcdeca9" ON "audit_log" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" character varying NOT NULL, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("sku" character varying NOT NULL, "name" character varying NOT NULL, "category" character varying NOT NULL, "price_cents" integer NOT NULL, "available" boolean NOT NULL, "active" boolean NOT NULL, CONSTRAINT "PK_c44ac33a05b144dd0d9ddcf9327" PRIMARY KEY ("sku"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "combos" ("sku" character varying NOT NULL, "name" character varying NOT NULL, "main_sku" character varying NOT NULL, "price_cents" integer NOT NULL, "side_skus" text array NOT NULL, "drink_skus" text array NOT NULL, "upgrade" jsonb, "active" boolean NOT NULL, CONSTRAINT "PK_d7c590074503720c6fec6b35dc6" PRIMARY KEY ("sku"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "modifiers" ("code" character varying NOT NULL, "name" character varying NOT NULL, "price_cents" integer NOT NULL, "active" boolean NOT NULL, "applies_to" text array NOT NULL, CONSTRAINT "PK_35e7b958aa71177a7b817ec6f23" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "coupons" ("code" character varying NOT NULL, "type" character varying NOT NULL, "value" integer NOT NULL, "minimum_cents" integer NOT NULL, "valid_from" date NOT NULL, "valid_to" date NOT NULL, "active" boolean NOT NULL, CONSTRAINT "PK_e025109230e82925843f2a14c48" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "pricing_parameters" ("id" integer NOT NULL DEFAULT '1', "tax_rate_basis_points" integer NOT NULL, "delivery_fee_cents" integer NOT NULL, "max_quantity_per_line" integer NOT NULL, "max_items_per_order" integer NOT NULL, CONSTRAINT "PK_c800b8196879a6529963bb92bf3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_lines" ADD CONSTRAINT "FK_6a619803439ea92778cafc8fb54" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" ADD CONSTRAINT "FK_1ca7d5228cf9dc589b60243933c" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_1ca7d5228cf9dc589b60243933c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_lines" DROP CONSTRAINT "FK_6a619803439ea92778cafc8fb54"`,
    );
    await queryRunner.query(`DROP TABLE "pricing_parameters"`);
    await queryRunner.query(`DROP TABLE "coupons"`);
    await queryRunner.query(`DROP TABLE "modifiers"`);
    await queryRunner.query(`DROP TABLE "combos"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_814321b4aeec81311f7fcdeca9"`,
    );
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(`DROP TABLE "order_status_history"`);
    await queryRunner.query(`DROP TABLE "order_lines"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_775c9f06fc27ae3ff8fb26f2c4"`,
    );
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "refunds"`);
    await queryRunner.query(`DROP TABLE "webhook_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_payment_attempt_one_active_per_order"`,
    );
    await queryRunner.query(`DROP TABLE "payment_attempts"`);
  }
}
